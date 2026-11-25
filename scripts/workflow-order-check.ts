import assert from "node:assert/strict";
import { advanceBlocker, organizerBody } from "../lib/engagement";
import { emptyDesk } from "../lib/return-desk";
import { initialWorkflow, type TeamReturn } from "../lib/return-workflow";
import { requestThreads } from "../lib/request-thread";
import type { IntakeAnswers } from "../lib/filing-needs";
import { documentRequests, seasonFor } from "../lib/season";
import type { DocumentRecord, Message, Profile, SignatureRecord } from "../lib/types";

const profile: Profile = {
  id: "profile-1",
  email: "client@example.com",
  role: "client",
  staffRank: "staff",
  staffStatus: "active",
  name: "Ada Client",
  phone: "",
  address: "1 Main",
  city: "Hamilton",
  state: "TX",
  zip: "76531",
  taxpayerType: "individual",
  taxIdLast4: "1234",
  spouseName: "",
  taxYears: "2025",
  createdAt: "2026-01-01T00:00:00.000Z",
  starred: false,
  snoozedUntil: null,
  avatarPath: null,
  portalAcceptedAt: null,
};

function workflow(patch: Partial<TeamReturn> = {}): TeamReturn {
  return {
    ...initialWorkflow,
    id: "return-1",
    profileId: profile.id,
    taxYear: 2025,
    entity: "Ada Client",
    taxpayerType: "individual",
    returnVersion: 1,
    services: ["tax_return"],
    ...patch,
    desk: { ...emptyDesk(), intakeAnswered: true, filingNeeds: ["wages"], ...patch.desk },
  };
}

function message(patch: Partial<Message> & Pick<Message, "id" | "body">): Message {
  return {
    profileId: profile.id,
    authorId: "staff-1",
    authorRole: "staff",
    kind: "event",
    createdAt: "2026-01-01T00:00:00.000Z",
    conversationId: null,
    delivery: null,
    attachments: [],
    returnId: "return-1",
    requestState: null,
    requestBlock: null,
    previousId: null,
    documentId: null,
    signatureId: null,
    ...patch,
  };
}

function organizer(id: string, title: string, state: Message["requestState"]): Message[] {
  const root = message({ id, body: organizerBody(title, "Needed."), requestState: "open", requestBlock: "start" });
  if (state === "open") return [root];
  return [root, message({ id: `${id}-latest`, previousId: id, body: "Accepted.", requestState: state })];
}

const blank: Profile = { ...profile, name: "", address: "", taxIdLast4: null };
assert.equal(seasonFor(blank, [], []), "profile");
assert.equal(seasonFor(profile, [], []), "scope");

const wages = documentRequests("individual", ["wages"]).filter((item) => item.required).map((item) => item.title);
assert.deepEqual(wages, ["Photo ID", "Last year's return", "W-2s"]);

const docs: DocumentRecord[] = [
  { id: "id", profileId: profile.id, kind: "photo_id", filename: "id.pdf", contentType: "application/pdf", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "prior", profileId: profile.id, kind: "prior_return", filename: "prior.pdf", contentType: "application/pdf", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "w2", profileId: profile.id, kind: "w2", filename: "w2.pdf", contentType: "application/pdf", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "form-1099", profileId: profile.id, kind: "1099", filename: "1099.pdf", contentType: "application/pdf", createdAt: "2026-01-01T00:00:00.000Z" },
];
const intake: IntakeAnswers = { answered: true, needs: ["wages"] };
assert.equal(seasonFor(profile, [], [], intake), "documents");
assert.equal(seasonFor(profile, [], docs, intake), "letter");
const signed: SignatureRecord = { id: "sig", profileId: profile.id, kind: "engagement", signedAt: "2026-02-01T00:00:00.000Z", ip: "127.0.0.1", userAgent: "test" };
assert.equal(seasonFor(profile, [signed], docs, intake), "ready");

const onboarding = workflow({ stage: "onboarding", desk: { ...emptyDesk(), intakeAnswered: false, filingNeeds: [] } });
assert.match(advanceBlocker({
  workflow: onboarding, profile, signatures: [], threads: [], authorizations: [], invoice: null, filings: [],
}) ?? "", /filing type/);

assert.equal(advanceBlocker({
  workflow: workflow({ stage: "onboarding" }), profile, signatures: [], threads: [], authorizations: [], invoice: null, filings: [],
}), null);

const openThreads = requestThreads([
  ...organizer("photo", "Photo ID", "accepted"),
  ...organizer("prior", "Last year's return", "open"),
  ...organizer("w2", "W-2s", "accepted"),
  ...organizer("form", "1099s", "open"),
]);
assert.match(advanceBlocker({
  workflow: workflow({ stage: "documents" }), profile, signatures: [signed], threads: openThreads, authorizations: [], invoice: null, filings: [],
}) ?? "", /Last year's return/);

const clearThreads = requestThreads([
  ...organizer("photo", "Photo ID", "accepted"),
  ...organizer("prior", "Last year's return", "accepted"),
  ...organizer("w2", "W-2s", "waived"),
  ...organizer("form", "1099s", "accepted"),
]);
assert.match(advanceBlocker({
  workflow: workflow({ stage: "documents" }), profile, signatures: [], threads: clearThreads, authorizations: [], invoice: null, filings: [],
}) ?? "", /engagement letter is not signed/);
assert.equal(advanceBlocker({
  workflow: workflow({ stage: "documents" }), profile, signatures: [signed], threads: clearThreads, authorizations: [], invoice: null, filings: [],
}), null);

console.log("workflow order ok");
