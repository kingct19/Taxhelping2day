import { isStage, stageOrder, stages, type Stage } from "@/lib/return-workflow";

export const automationEvents = ["invited", "accepted", "profile_complete", "documents_ready", "efile_signed", "filing_accepted"] as const;
export type AutomationEvent = (typeof automationEvents)[number];

export const triggerKinds = ["event", "entered_stage", "stage_age", "tag_added", "tag_removed"] as const;
export type TriggerKind = (typeof triggerKinds)[number];

export const conditionModes = ["has", "missing"] as const;
export type ConditionMode = (typeof conditionModes)[number];

export type Automation = {
  id: string;
  name: string;
  enabled: boolean;
  triggerKind: TriggerKind;
  event: AutomationEvent | null;
  stage: Stage | null;
  afterDays: number | null;
  tagId: string | null;
  conditionTagId: string | null;
  conditionMode: ConditionMode | null;
  moveToStage: Stage | null;
  emailSubject: string | null;
  emailBody: string | null;
  addTagId: string | null;
  removeTagId: string | null;
  position: number;
};

export type FirmTag = {
  id: string;
  name: string;
  createdAt: string;
};

export type ReturnTag = {
  returnId: string;
  tagId: string;
  createdAt: string;
};

export type AutomationFire = {
  automationId: string;
  returnId: string;
  triggerKey: string;
  firedAt: string;
};

export type AutomationDraft = {
  id?: string;
  name: string;
  enabled: boolean;
  triggerKind: string;
  event: string | null;
  stage: string | null;
  afterDays: number | null;
  tagId: string | null;
  conditionTagId: string | null;
  conditionMode: string | null;
  moveToStage: string | null;
  emailSubject: string | null;
  emailBody: string | null;
  addTagId: string | null;
  removeTagId: string | null;
  position?: number;
};

const defaultIds = {
  invited: "a1000000-0000-4000-8000-000000000001",
  accepted: "a1000000-0000-4000-8000-000000000002",
  profile: "a1000000-0000-4000-8000-000000000003",
  documents: "a1000000-0000-4000-8000-000000000004",
  efile: "a1000000-0000-4000-8000-000000000005",
  filing: "a1000000-0000-4000-8000-000000000006",
  documentsWait: "a1000000-0000-4000-8000-000000000007",
  leadCheck: "a1000000-0000-4000-8000-000000000008",
} as const;

function blankRule(input: Pick<Automation, "id" | "name" | "enabled" | "triggerKind" | "position"> & Partial<Automation>): Automation {
  return {
    event: null,
    stage: null,
    afterDays: null,
    tagId: null,
    conditionTagId: null,
    conditionMode: null,
    moveToStage: null,
    emailSubject: null,
    emailBody: null,
    addTagId: null,
    removeTagId: null,
    ...input,
  };
}

export function defaultAutomations(): Automation[] {
  return [
    blankRule({ id: defaultIds.invited, name: "Client invited", enabled: true, triggerKind: "event", event: "invited", moveToStage: "lead", position: 0 }),
    blankRule({ id: defaultIds.accepted, name: "Invite accepted", enabled: true, triggerKind: "event", event: "accepted", moveToStage: "onboarding", position: 1 }),
    blankRule({ id: defaultIds.profile, name: "Basic information saved", enabled: true, triggerKind: "event", event: "profile_complete", moveToStage: "documents", position: 2 }),
    blankRule({ id: defaultIds.documents, name: "Documents ready", enabled: true, triggerKind: "event", event: "documents_ready", moveToStage: "preparation", position: 3 }),
    blankRule({ id: defaultIds.efile, name: "Form 8879 signed", enabled: false, triggerKind: "event", event: "efile_signed", moveToStage: "filing", position: 4 }),
    blankRule({ id: defaultIds.filing, name: "Filing accepted", enabled: false, triggerKind: "event", event: "filing_accepted", moveToStage: "delivery", position: 5 }),
    blankRule({
      id: defaultIds.documentsWait,
      name: "Documents still waiting",
      enabled: false,
      triggerKind: "stage_age",
      stage: "documents",
      afterDays: 7,
      emailSubject: "Documents are still waiting",
      emailBody: "Hi {{client_name}}, a few documents are still waiting in your portal. Sign in when you can: {{portal_link}}",
      position: 6,
    }),
    blankRule({
      id: defaultIds.leadCheck,
      name: "Lead check-in",
      enabled: false,
      triggerKind: "stage_age",
      stage: "lead",
      afterDays: 3,
      emailSubject: "We're ready when you are",
      emailBody: "Hi {{client_name}}, {{firm_name}} invited you to the portal. Sign in to get started: {{portal_link}}",
      position: 7,
    }),
  ];
}

export function isAutomationEvent(value: string): value is AutomationEvent {
  return automationEvents.some((event) => event === value);
}

export function isTriggerKind(value: string): value is TriggerKind {
  return triggerKinds.some((kind) => kind === value);
}

export function isConditionMode(value: string): value is ConditionMode {
  return conditionModes.some((mode) => mode === value);
}

export function cleanTagName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > 40) return null;
  return trimmed;
}

export function eventLabel(event: AutomationEvent): string {
  switch (event) {
    case "invited":
      return "a client is invited";
    case "accepted":
      return "the invite is accepted";
    case "profile_complete":
      return "basic information is saved";
    case "documents_ready":
      return "documents are ready";
    case "efile_signed":
      return "Form 8879 is signed";
    case "filing_accepted":
      return "a filing is accepted";
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

export function triggerSummary(rule: Automation, tagName: (id: string) => string): string {
  switch (rule.triggerKind) {
    case "event":
      return rule.event ? `When ${eventLabel(rule.event)}` : "When an event happens";
    case "entered_stage":
      return rule.stage ? `When the return enters ${stages[rule.stage]}` : "When the return enters a stage";
    case "stage_age":
      return rule.stage && rule.afterDays != null
        ? `In ${stages[rule.stage]} for ${rule.afterDays} ${rule.afterDays === 1 ? "day" : "days"}`
        : "After time in a stage";
    case "tag_added":
      return `When ${tagName(rule.tagId ?? "")} is added`;
    case "tag_removed":
      return `When ${tagName(rule.tagId ?? "")} is removed`;
    default: {
      const exhaustive: never = rule.triggerKind;
      return exhaustive;
    }
  }
}

export function actionSummary(rule: Automation, tagName: (id: string) => string): string {
  const parts: string[] = [];
  if (rule.moveToStage) parts.push(`Move to ${stages[rule.moveToStage]}`);
  if (rule.emailSubject) parts.push("Send email");
  if (rule.addTagId) parts.push(`Add ${tagName(rule.addTagId)}`);
  if (rule.removeTagId) parts.push(`Remove ${tagName(rule.removeTagId)}`);
  return parts.join(", ") || "No action";
}

export function actionKind(rule: Automation): "move" | "email" | "tag" {
  if (rule.moveToStage) return "move";
  if (rule.emailSubject || rule.emailBody) return "email";
  return "tag";
}

export function ruleUsesTag(rule: Automation, tagId: string): boolean {
  return rule.tagId === tagId || rule.conditionTagId === tagId || rule.addTagId === tagId || rule.removeTagId === tagId;
}

function optionalStage(value: string | null): Stage | null | "invalid" {
  if (!value) return null;
  return isStage(value) ? value : "invalid";
}

export function automationFromDraft(draft: AutomationDraft, id: string): Automation | string {
  const name = draft.name.trim().replace(/\s+/g, " ");
  if (!name || name.length > 80) return "Name the automation in 80 characters or fewer.";
  if (!isTriggerKind(draft.triggerKind)) return "Choose what starts this automation.";
  const event = draft.event && isAutomationEvent(draft.event) ? draft.event : null;
  const stage = optionalStage(draft.stage);
  const moveToStage = optionalStage(draft.moveToStage);
  if (stage === "invalid" || moveToStage === "invalid") return "Choose a stage on the board.";
  if (draft.triggerKind === "event" && !event) return "Choose the event.";
  if ((draft.triggerKind === "entered_stage" || draft.triggerKind === "stage_age") && !stage) return "Choose the stage.";
  let afterDays: number | null = null;
  if (draft.triggerKind === "stage_age") {
    if (draft.afterDays == null || !Number.isInteger(draft.afterDays) || draft.afterDays < 0 || draft.afterDays > 365) {
      return "Enter a wait from 0 to 365 days.";
    }
    afterDays = draft.afterDays;
  }
  if ((draft.triggerKind === "tag_added" || draft.triggerKind === "tag_removed") && !draft.tagId) return "Choose the tag.";
  const conditionMode = draft.conditionMode && isConditionMode(draft.conditionMode) ? draft.conditionMode : null;
  if ((conditionMode && !draft.conditionTagId) || (!conditionMode && draft.conditionTagId)) return "Choose whether the return has the tag.";
  const emailSubject = draft.emailSubject?.trim() || null;
  const emailBody = draft.emailBody?.trim() || null;
  if ((emailSubject && !emailBody) || (!emailSubject && emailBody)) return "Enter both the email subject and the message.";
  if (emailSubject && emailSubject.length > 200) return "Keep the subject under 200 characters.";
  if (emailBody && emailBody.length > 2000) return "Keep the email under 2,000 characters.";
  if (!moveToStage && !emailSubject && !draft.addTagId && !draft.removeTagId) return "Add a stage move, an email, or a tag change.";
  return {
    id,
    name,
    enabled: draft.enabled,
    triggerKind: draft.triggerKind,
    event: draft.triggerKind === "event" ? event : null,
    stage: draft.triggerKind === "entered_stage" || draft.triggerKind === "stage_age" ? stage : null,
    afterDays,
    tagId: draft.triggerKind === "tag_added" || draft.triggerKind === "tag_removed" ? draft.tagId : null,
    conditionTagId: conditionMode ? draft.conditionTagId : null,
    conditionMode,
    moveToStage,
    emailSubject,
    emailBody,
    addTagId: draft.addTagId,
    removeTagId: draft.removeTagId,
    position: draft.position ?? 0,
  };
}

export function fillEmail(template: string, values: { clientName: string; firmName: string; portalLink: string }): string {
  return template
    .replaceAll("{{client_name}}", values.clientName)
    .replaceAll("{{firm_name}}", values.firmName)
    .replaceAll("{{portal_link}}", values.portalLink);
}

export function allowsAutomationMove(trigger: TriggerKind, from: Stage, to: Stage): boolean {
  if (from === to) return false;
  if (trigger === "tag_added" || trigger === "tag_removed" || trigger === "stage_age") return true;
  return stageOrder.indexOf(to) > stageOrder.indexOf(from);
}

export function daysSince(iso: string, now: Date): number {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 0;
  return Math.max(0, Math.floor((now.getTime() - then) / 86_400_000));
}

export function conditionMatches(rule: Automation, tagIds: string[]): boolean {
  if (!rule.conditionMode || !rule.conditionTagId) return true;
  const has = tagIds.includes(rule.conditionTagId);
  switch (rule.conditionMode) {
    case "has":
      return has;
    case "missing":
      return !has;
    default: {
      const exhaustive: never = rule.conditionMode;
      return exhaustive;
    }
  }
}

export function currentFilingYear(now = new Date()): number {
  return now.getFullYear() - 1;
}
