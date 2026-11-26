import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runAccepted, runDocumentsReady, runDueAutomations, runInvited, runProfileComplete, runTagChange } from "../lib/automation-run";
import type { Automation } from "../lib/automations";
import { getStore } from "../lib/store";
import type { ProfileUpdate } from "../lib/types";

function ignoreRender(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/revalidate|static generation|workUnitAsyncStorage|Invariant/i.test(message)) return;
  throw error;
}

async function settle(work: () => Promise<void>) {
  try {
    await work();
  } catch (error) {
    ignoreRender(error);
  }
}

async function stageOf(profileId: string) {
  const open = (await getStore().listTeamReturns()).filter((row) => row.profileId === profileId && !row.archivedAt);
  assert.equal(open.length, 1);
  return open[0];
}

function profilePatch(name: string, taxId?: string): ProfileUpdate {
  return {
    name,
    phone: "",
    address: "1 Main",
    city: "Hamilton",
    state: "TX",
    zip: "76531",
    taxpayerType: "individual",
    filingTypes: ["individual"],
    spouseName: "",
    taxYears: "2025",
    taxId,
  };
}

async function acceptOrganizer(profileId: string, returnId: string, authorId: string) {
  const store = getStore();
  const messages = await store.listMessages(profileId);
  for (const message of messages) {
    if (message.returnId !== returnId || message.requestState !== "open" || message.previousId) continue;
    await store.addMessage({
      profileId,
      returnId,
      authorId,
      authorRole: "staff",
      kind: "event",
      body: "Accepted for the check.",
      previousId: message.id,
      requestState: "accepted",
    });
  }
}

async function main() {
  const store = getStore();
  await store.ensureStaff();
  const staff = (await store.listProfiles()).find((person) => person.role === "staff");
  assert.ok(staff);
  const defaults = await store.listAutomations();
  assert.equal(defaults.length, 9);
  assert.equal(defaults.filter((rule) => rule.enabled).length, 5);

  const waiting = await store.createClient({ email: "age-check@example.com", name: "Age Check" });
  await settle(() => runInvited(waiting.id));
  let waitingReturn = await stageOf(waiting.id);
  assert.equal(waitingReturn.stage, "lead");

  const reminder: Automation = {
    id: "b2000000-0000-4000-8000-000000000001",
    name: "Lead today",
    enabled: true,
    triggerKind: "stage_age",
    event: null,
    stage: "lead",
    afterDays: 0,
    tagId: null,
    conditionTagId: null,
    conditionMode: null,
    moveToStage: "review",
    emailSubject: "Checking in",
    emailBody: "Hi {{client_name}}",
    addTagId: null,
    removeTagId: null,
    position: 20,
  };
  await store.saveAutomation(reminder);
  await runDueAutomations({ revalidate: false });
  waitingReturn = await stageOf(waiting.id);
  assert.equal(waitingReturn.stage, "review");
  const notes = await store.listMessages(waiting.id);
  assert.ok(notes.some((message) => message.body.includes("could not email")));
  await runDueAutomations({ revalidate: false });
  assert.equal(await countFires(reminder.id, waitingReturn.id), 1);

  const client = await store.createClient({ email: "path-check@example.com", name: "Path Check" });
  await settle(() => runInvited(client.id));
  assert.equal((await stageOf(client.id)).stage, "lead");
  await settle(() => runInvited(client.id));
  assert.equal((await store.listTeamReturns()).filter((row) => row.profileId === client.id).length, 1);

  const accepted = defaults.find((rule) => rule.event === "accepted");
  assert.ok(accepted);
  await store.setAutomationEnabled(accepted.id, false);
  assert.equal(await store.markPortalAccepted(client.id), true);
  assert.equal(await store.markPortalAccepted(client.id), false);
  await runAccepted(client.id, false);
  assert.equal((await stageOf(client.id)).stage, "lead");
  await store.setAutomationEnabled(accepted.id, true);
  await runAccepted(client.id, false);
  assert.equal((await stageOf(client.id)).stage, "onboarding");

  await store.updateProfile(client.id, profilePatch("Path Check", "123456789"));
  await settle(() => runProfileComplete(client.id));
  const documents = await stageOf(client.id);
  assert.equal(documents.stage, "documents");
  const organizer = (await store.listMessages(client.id)).filter((message) => message.returnId === documents.id && message.requestState === "open");
  assert.ok(organizer.length > 0);
  await acceptOrganizer(client.id, documents.id, staff.id);
  await store.addSignature({ profileId: client.id, kind: "engagement", bytes: Buffer.from("%PDF-1.1"), ip: "127.0.0.1", userAgent: "automation-check" });
  await settle(() => runDocumentsReady(client.id, documents.id));
  assert.equal((await stageOf(client.id)).stage, "preparation");

  const tagged = await store.createClient({ email: "tag-check@example.com", name: "Tag Check" });
  await settle(() => runInvited(tagged.id));
  const rush = await store.saveTag("Rush");
  assert.ok(!("error" in rush));
  const renamed = await store.saveTag("Rush filing", rush.tag.id);
  assert.ok(!("error" in renamed));
  const tagRule: Automation = {
    id: "b2000000-0000-4000-8000-000000000002",
    name: "Rush to prep",
    enabled: true,
    triggerKind: "tag_added",
    event: null,
    stage: null,
    afterDays: null,
    tagId: renamed.tag.id,
    conditionTagId: null,
    conditionMode: null,
    moveToStage: "preparation",
    emailSubject: null,
    emailBody: null,
    addTagId: null,
    removeTagId: null,
    position: 21,
  };
  await store.saveAutomation(tagRule);
  const blocked = await store.deleteTag(renamed.tag.id);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.match(blocked.error, /Rush to prep/);
  const taggedReturn = await stageOf(tagged.id);
  const added = await store.addReturnTag(taggedReturn.id, renamed.tag.id);
  assert.ok(!("error" in added) && added.created);
  await settle(() => runTagChange(taggedReturn.id, renamed.tag.id, "added", added.createdAt));
  assert.equal((await stageOf(tagged.id)).stage, "preparation");
  await store.removeReturnTag(taggedReturn.id, renamed.tag.id);
  await store.setAutomationEnabled(tagRule.id, false);
  const again = await store.addReturnTag(taggedReturn.id, renamed.tag.id);
  assert.ok(!("error" in again) && again.created);
  await settle(() => runTagChange(taggedReturn.id, renamed.tag.id, "added", again.createdAt));
  assert.equal((await stageOf(tagged.id)).stage, "preparation");

  const firstTag = await store.saveTag("First");
  const secondTag = await store.saveTag("Second");
  assert.ok(!("error" in firstTag) && !("error" in secondTag));
  const chainStart: Automation = {
    id: "b2000000-0000-4000-8000-000000000003",
    name: "First tag",
    enabled: true,
    triggerKind: "tag_added",
    event: null,
    stage: null,
    afterDays: null,
    tagId: firstTag.tag.id,
    conditionTagId: null,
    conditionMode: null,
    moveToStage: "documents",
    emailSubject: null,
    emailBody: null,
    addTagId: secondTag.tag.id,
    removeTagId: null,
    position: 22,
  };
  const chainNext: Automation = {
    id: "b2000000-0000-4000-8000-000000000004",
    name: "Second tag",
    enabled: true,
    triggerKind: "tag_added",
    event: null,
    stage: null,
    afterDays: null,
    tagId: secondTag.tag.id,
    conditionTagId: null,
    conditionMode: null,
    moveToStage: "filing",
    emailSubject: null,
    emailBody: null,
    addTagId: null,
    removeTagId: null,
    position: 23,
  };
  await store.saveAutomation(chainStart);
  await store.saveAutomation(chainNext);
  const chained = await store.createClient({ email: "chain-check@example.com", name: "Chain Check" });
  await settle(() => runInvited(chained.id));
  const chainedReturn = await stageOf(chained.id);
  const firstAdd = await store.addReturnTag(chainedReturn.id, firstTag.tag.id);
  assert.ok(!("error" in firstAdd) && firstAdd.created);
  await settle(() => runTagChange(chainedReturn.id, firstTag.tag.id, "added", firstAdd.createdAt));
  const afterChain = await stageOf(chained.id);
  assert.equal(afterChain.stage, "documents");
  const applied = (await store.listReturnTags()).filter((row) => row.returnId === chainedReturn.id).map((row) => row.tagId);
  assert.ok(applied.includes(secondTag.tag.id));
  await settle(() => runTagChange(chainedReturn.id, secondTag.tag.id, "added", new Date().toISOString()));
  assert.equal((await stageOf(chained.id)).stage, "filing");

  const leadCheck = defaults.find((rule) => rule.name === "Lead check-in");
  assert.ok(leadCheck);
  await store.deleteAutomation(leadCheck.id);
  const remaining = await store.listAutomations();
  assert.equal(remaining.some((rule) => rule.id === leadCheck.id), false);
  assert.equal(remaining.length, defaults.length - 1 + 4);

  console.log("automation checks passed");
}

async function countFires(automationId: string, returnId: string) {
  const raw = await readFile(join(process.cwd(), "data", "db.json"), "utf8");
  const db = JSON.parse(raw) as { automationFires?: { automationId: string; returnId: string }[] };
  return (db.automationFires ?? []).filter((row) => row.automationId === automationId && row.returnId === returnId).length;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
