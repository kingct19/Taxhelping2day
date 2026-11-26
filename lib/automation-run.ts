import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import {
  allowsAutomationMove,
  conditionMatches,
  currentFilingYear,
  daysSince,
  fillEmail,
  type Automation,
  type AutomationEvent,
} from "@/lib/automations";
import { firm, siteUrl } from "@/lib/firm";
import { intakeBlocker } from "@/lib/engagement";
import { deriveStage } from "@/lib/next-action";
import { seedOrganizer } from "@/lib/organizer";
import { requestThreads } from "@/lib/request-thread";
import { stageIndex, stageOrder, stages, type Stage, type TeamReturn } from "@/lib/return-workflow";
import { getStore } from "@/lib/store";
import { isActiveStaff } from "@/lib/teammates";
import type { Profile } from "@/lib/types";

type ReturnSignal =
  | { kind: "event"; event: AutomationEvent; returnId: string; revalidate?: boolean }
  | { kind: "entered_stage"; stage: Stage; returnId: string; stageEnteredAt: string; chained?: boolean; revalidate?: boolean }
  | { kind: "tag_added"; tagId: string; returnId: string; at: string; revalidate?: boolean }
  | { kind: "tag_removed"; tagId: string; returnId: string; at: string; revalidate?: boolean }
  | { kind: "due"; returnId: string; revalidate?: boolean };

let dueFlight: Promise<void> | null = null;

function matches(rule: Automation, signal: ReturnSignal, item: TeamReturn, now: Date): boolean {
  switch (rule.triggerKind) {
    case "event":
      return signal.kind === "event" && rule.event === signal.event;
    case "entered_stage":
      return signal.kind === "entered_stage" && rule.stage === signal.stage;
    case "stage_age":
      return signal.kind === "due" && rule.stage === item.stage && rule.afterDays != null && Boolean(item.stageEnteredAt) && daysSince(item.stageEnteredAt, now) >= rule.afterDays;
    case "tag_added":
      return signal.kind === "tag_added" && rule.tagId === signal.tagId;
    case "tag_removed":
      return signal.kind === "tag_removed" && rule.tagId === signal.tagId;
    default: {
      const exhaustive: never = rule.triggerKind;
      return exhaustive;
    }
  }
}

function fireKey(rule: Automation, signal: ReturnSignal, item: TeamReturn): string | null {
  switch (rule.triggerKind) {
    case "event":
      return rule.event === "return_cancelled" ? `${rule.event}:${item.revision}` : rule.event;
    case "entered_stage":
      return rule.stage ? `entered:${rule.stage}:${signal.kind === "entered_stage" ? signal.stageEnteredAt : item.stageEnteredAt}` : null;
    case "stage_age":
      return rule.stage && rule.afterDays != null && item.stageEnteredAt ? `age:${rule.stage}:${item.stageEnteredAt}:${rule.afterDays}` : null;
    case "tag_added":
      return signal.kind === "tag_added" ? `added:${signal.tagId}:${signal.at}` : null;
    case "tag_removed":
      return signal.kind === "tag_removed" ? `removed:${signal.tagId}:${signal.at}` : null;
    default: {
      const exhaustive: never = rule.triggerKind;
      return exhaustive;
    }
  }
}

function touch(profileId: string, returnId: string, revalidate: boolean) {
  if (!revalidate) return;
  revalidatePath("/tasks");
  revalidatePath("/tasks/table");
  revalidatePath("/returns");
  revalidatePath("/dashboard");
  revalidatePath("/inbox");
  revalidatePath("/portal");
  revalidatePath(`/returns/${profileId}/${returnId}`);
  revalidatePath(`/contacts/${profileId}`);
}

async function staffId(): Promise<string | null> {
  const store = getStore();
  await store.ensureStaff();
  const people = await store.listProfiles();
  return people.find((person) => isActiveStaff(person))?.id ?? null;
}

async function moveReturn(current: TeamReturn, rule: Automation, stage: Stage): Promise<TeamReturn | "conflict"> {
  const store = getStore();
  const [messages, author] = await Promise.all([store.listMessages(current.profileId), staffId()]);
  const threads = requestThreads(messages.filter((row) => row.returnId === current.id));
  const derived = deriveStage({ ...current, stage }, threads);
  const now = new Date().toISOString();
  const dest = stageIndex(stage);
  const delivery = stageOrder.indexOf("delivery");
  const saved = await store.updateWorkflow(current.id, {
    ...current,
    stage,
    waitingOn: derived.waitingOn,
    nextAction: derived.nextAction || current.nextAction,
    deliveredAt: dest >= delivery ? current.deliveredAt ?? now : current.deliveredAt,
    archivedAt: stage === "renewal" ? current.archivedAt ?? now : current.archivedAt,
  });
  if (!saved) return "conflict";
  if (stage === "documents" && author) {
    await seedOrganizer(current.profileId, current.id, author, current.filingTypeId || current.taxpayerType, current.desk);
  }
  if (author) {
    await store.addMessage({
      profileId: current.profileId,
      returnId: current.id,
      authorId: author,
      authorRole: "staff",
      kind: "event",
      body: `Moved to ${stages[stage]} by automation “${rule.name}”.`,
    });
  }
  const fresh = (await store.listTeamReturns()).find((row) => row.id === current.id);
  return fresh ?? { ...current, stage };
}

async function sendRuleEmail(rule: Automation, item: TeamReturn) {
  const store = getStore();
  const client = await store.getProfile(item.profileId);
  const author = await staffId();
  if (!rule.emailSubject || !rule.emailBody || client?.role !== "client") return;
  const text = fillEmail(rule.emailBody, {
    clientName: client.name || client.email,
    firmName: firm.name,
    portalLink: `${siteUrl}/portal`,
  });
  const subject = fillEmail(rule.emailSubject, {
    clientName: client.name || client.email,
    firmName: firm.name,
    portalLink: `${siteUrl}/portal`,
  });
  const note = async (body: string) => {
    if (!author) return;
    await store.addMessage({
      profileId: item.profileId,
      returnId: item.id,
      authorId: author,
      authorRole: "staff",
      kind: "note",
      body,
    });
  };
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    await note(`Automation “${rule.name}” could not email the client. Configure the firm's email sender.`);
    return;
  }
  const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.EMAIL_FROM,
    to: client.email,
    subject,
    text,
  });
  if (result.error) await note(`Automation “${rule.name}” could not email the client.`);
}

async function applyRule(rule: Automation, item: TeamReturn, key: string, revalidate: boolean): Promise<TeamReturn> {
  const store = getStore();
  if (key.length > 200) return item;
  if (await store.automationFired(rule.id, item.id, key)) return item;
  const tags = (await store.listReturnTags()).filter((row) => row.returnId === item.id).map((row) => row.tagId);
  if (!conditionMatches(rule, tags)) return item;
  let current = item;
  if (rule.moveToStage && allowsAutomationMove(rule.triggerKind, current.stage, rule.moveToStage)) {
    const moved = await moveReturn(current, rule, rule.moveToStage);
    if (moved === "conflict") return current;
    current = moved;
  }
  if (rule.emailSubject && rule.emailBody) await sendRuleEmail(rule, current);
  if (rule.addTagId) await store.addReturnTag(current.id, rule.addTagId);
  if (rule.removeTagId) await store.removeReturnTag(current.id, rule.removeTagId);
  await store.recordAutomationFire(rule.id, current.id, key);
  touch(current.profileId, current.id, revalidate);
  return current;
}

async function runForReturn(signal: ReturnSignal) {
  const store = getStore();
  let item = (await store.listTeamReturns()).find((row) => row.id === signal.returnId);
  if (!item || item.archivedAt || item.stage === "canceled") return;
  const started = item.stage;
  const rules = (await store.listAutomations()).filter((rule) => rule.enabled);
  const now = new Date();
  const revalidate = signal.revalidate !== false;
  for (const rule of rules) {
    item = (await store.listTeamReturns()).find((row) => row.id === signal.returnId) ?? item;
    if (!matches(rule, signal, item, now)) continue;
    const key = fireKey(rule, signal, item);
    if (!key) continue;
    item = await applyRule(rule, item, key, revalidate);
  }
  item = (await store.listTeamReturns()).find((row) => row.id === signal.returnId) ?? item;
  const chained = signal.kind === "entered_stage" && signal.chained === true;
  if (!chained && item.stage !== started && item.stageEnteredAt) {
    await runForReturn({
      kind: "entered_stage",
      stage: item.stage,
      returnId: item.id,
      stageEnteredAt: item.stageEnteredAt,
      chained: true,
      revalidate: signal.revalidate,
    });
  }
}

async function ensureOpenReturn(profile: Profile): Promise<TeamReturn | null> {
  const store = getStore();
  const open = (await store.listTeamReturns()).filter((row) => row.profileId === profile.id && !row.archivedAt);
  if (open.length > 0) {
    const year = currentFilingYear();
    return open.find((row) => row.taxYear === year) ?? [...open].sort((a, b) => b.taxYear - a.taxYear)[0];
  }
  const entity = (profile.name.trim() || profile.email).slice(0, 150);
  if (!entity) return null;
  const year = currentFilingYear();
  await store.createReturn({
    profileId: profile.id,
    taxYear: year,
    entity,
    taxpayerType: "individual",
    source: "inquiry",
    services: [],
  });
  const again = (await store.listTeamReturns()).filter((row) => row.profileId === profile.id && !row.archivedAt);
  return again.find((row) => row.taxYear === year) ?? again[0] ?? null;
}

export async function runInvited(profileId: string) {
  const profile = await getStore().getProfile(profileId);
  if (!profile || profile.role !== "client") return;
  const item = await ensureOpenReturn(profile);
  if (!item) return;
  await runForReturn({ kind: "event", event: "invited", returnId: item.id, revalidate: true });
}

export async function runAccepted(profileId: string, revalidate = true) {
  const profile = await getStore().getProfile(profileId);
  if (!profile || profile.role !== "client") return;
  const item = await ensureOpenReturn(profile);
  if (!item) return;
  await runForReturn({ kind: "event", event: "accepted", returnId: item.id, revalidate });
}

export async function runProfileComplete(profileId: string) {
  const store = getStore();
  const profile = await store.getProfile(profileId);
  if (!profile || profile.role !== "client") return;
  const open = (await store.listTeamReturns()).filter((row) => row.profileId === profileId && !row.archivedAt);
  const filing = (profile.filingTypes?.length ?? 0) > 0 || open.some((row) => row.desk.intakeAnswered);
  if (!profile.name.trim() || !profile.address.trim() || !profile.taxIdLast4 || !filing) return;
  for (const item of open) {
    await runForReturn({ kind: "event", event: "profile_complete", returnId: item.id, revalidate: true });
  }
}

export async function runDocumentsReady(profileId: string, returnId: string) {
  const store = getStore();
  const [team, profile, signatures, messages, catalog] = await Promise.all([
    store.listTeamReturns(),
    store.getProfile(profileId),
    store.listSignatures(profileId),
    store.listMessages(profileId),
    store.getFilingCatalog(),
  ]);
  const workflow = team.find((row) => row.id === returnId && row.profileId === profileId);
  if (!workflow || !profile) return;
  const threads = requestThreads(messages.filter((row) => row.returnId === returnId));
  if (intakeBlocker(workflow.filingTypeId || workflow.taxpayerType, threads, workflow.desk, "preparation", catalog)) return;
  if (!signatures.some((item) => item.kind === "engagement")) return;
  await runForReturn({ kind: "event", event: "documents_ready", returnId, revalidate: true });
}

export async function runEfileSigned(returnId: string) {
  const store = getStore();
  const [team, rows] = await Promise.all([store.listTeamReturns(), store.listAuthorizations(returnId)]);
  const item = team.find((row) => row.id === returnId);
  if (!item) return;
  const version = rows.filter((row) => row.returnVersion === item.returnVersion);
  if (!version.some((row) => row.status === "signed") || version.some((row) => row.status === "needed")) return;
  await runForReturn({ kind: "event", event: "efile_signed", returnId, revalidate: true });
}

export async function runFilingAccepted(returnId: string) {
  await runForReturn({ kind: "event", event: "filing_accepted", returnId, revalidate: true });
}

export async function runReturnCancelled(returnId: string) {
  await runForReturn({ kind: "event", event: "return_cancelled", returnId, revalidate: true });
}

export async function runEnteredStage(returnId: string) {
  const item = (await getStore().listTeamReturns()).find((row) => row.id === returnId);
  if (!item) return;
  await runForReturn({
    kind: "entered_stage",
    stage: item.stage,
    returnId,
    stageEnteredAt: item.stageEnteredAt || new Date().toISOString(),
    revalidate: true,
  });
}

export async function runTagChange(returnId: string, tagId: string, change: "added" | "removed", at: string) {
  await runForReturn({
    kind: change === "added" ? "tag_added" : "tag_removed",
    tagId,
    returnId,
    at,
    revalidate: true,
  });
}

export async function runDueAutomations(options?: { revalidate?: boolean }) {
  if (dueFlight) return dueFlight;
  dueFlight = (async () => {
    const store = getStore();
    const returns = await store.listTeamReturns();
    for (const item of returns) {
      if (item.archivedAt) continue;
      if (!item.stageEnteredAt) await store.stampStageEntered(item.id);
      await runForReturn({ kind: "due", returnId: item.id, revalidate: options?.revalidate ?? false });
    }
  })().finally(() => {
    dueFlight = null;
  });
  return dueFlight;
}
