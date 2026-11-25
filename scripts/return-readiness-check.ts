import assert from "node:assert/strict";
import { organizerBody } from "@/lib/engagement";
import { requestThreads } from "@/lib/request-thread";
import { emptyDesk, type ReturnDesk } from "@/lib/return-desk";
import {
  getAuthorizationReadiness,
  getDeliveryReadiness,
  getDocumentReadiness,
  getFilingReadiness,
  getPreparationReadiness,
  getReviewReadiness,
} from "@/lib/return-readiness";
import { initialWorkflow, type TeamReturn } from "@/lib/return-workflow";
import type { EfileAuthorization, FilingRecord, Message, Profile } from "@/lib/types";

const profile: Profile = {
  id: "profile-1",
  email: "client@example.com",
  role: "client",
  staffRank: "staff",
  staffStatus: "active",
  name: "Ada Client",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  taxpayerType: "individual",
  taxIdLast4: null,
  spouseName: "",
  taxYears: "",
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
    stage: "documents",
    ...patch,
    desk: { ...emptyDesk(), ...patch.desk },
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

function gate(item: TeamReturn, messages: Message[] = [], extra: Partial<Parameters<typeof getDocumentReadiness>[0]> = {}) {
  return {
    workflow: item,
    profile,
    signatures: [],
    threads: requestThreads(messages),
    authorizations: [],
    invoice: null,
    filings: [],
    note: "",
    ...extra,
  };
}

function organizer(id: string, title: string, state: Message["requestState"], documentId: string | null = null): Message[] {
  const root = message({
    id,
    body: organizerBody(title, "Needed for this return."),
    requestState: "open",
    requestBlock: "start",
  });
  if (state === "open") return [root];
  return [root, message({
    id: `${id}-latest`,
    previousId: id,
    body: state === "responded" ? "Uploaded brokerage.pdf for review." : state === "waived" ? "Waived: not issued." : "Document accepted.",
    requestState: state,
    documentId,
  })];
}

const uploaded = gate(workflow({ stage: "documents" }), [
  ...organizer("photo", "Photo ID", "responded", "file-1"),
  ...organizer("prior", "Last year's return", "open"),
]);
assert.equal(getDocumentReadiness(uploaded).readiness, "needs_attention");

const accepted = gate(workflow({ stage: "preparation" }), [
  ...organizer("photo", "Photo ID", "accepted", "file-1"),
  ...organizer("prior", "Last year's return", "accepted", "file-2"),
]);
assert.equal(getDocumentReadiness(accepted).readiness, "complete");

const correction = gate(workflow({ stage: "documents" }), [
  ...organizer("photo", "Photo ID", "replacement", "file-1"),
  ...organizer("prior", "Last year's return", "accepted", "file-2"),
]);
assert.equal(getDocumentReadiness(correction).readiness, "blocked");

const waived = gate(workflow({ stage: "preparation" }), [
  ...organizer("photo", "Photo ID", "waived"),
  ...organizer("prior", "Last year's return", "waived"),
]);
assert.equal(getDocumentReadiness(waived).readiness, "complete");

const preparedDesk: ReturnDesk = {
  ...emptyDesk(),
  preparationChecks: {
    income: { done: true, at: "2026-02-01T00:00:00.000Z" },
    software: { done: true, at: "2026-02-01T00:00:00.000Z" },
    done: { done: true, at: "2026-02-01T00:00:00.000Z" },
  },
  preparedVersion: 1,
};
assert.equal(getPreparationReadiness(gate(workflow({ stage: "review", owner: "staff-1", desk: preparedDesk }))).readiness, "complete");

const correctionDesk: ReturnDesk = {
  ...preparedDesk,
  issues: [{
    id: "issue-1",
    area: "review",
    title: "Recheck the brokerage",
    detail: "The 1099 total does not match.",
    priority: "high",
    assigneeId: "staff-1",
    blocking: true,
    status: "open",
    checkKey: null,
    createdAt: "2026-02-02T00:00:00.000Z",
    resolvedAt: null,
  }],
};
assert.equal(getReviewReadiness(gate(workflow({ stage: "review", reviewerId: "reviewer-1", desk: correctionDesk }))).readiness, "blocked");

const approvedDesk: ReturnDesk = {
  ...emptyDesk(),
  reviewChecks: {
    income: { done: true, at: "2026-02-03T00:00:00.000Z" },
    approved: { done: true, at: "2026-02-03T00:00:00.000Z" },
  },
  reviewedVersion: 2,
};
assert.equal(getReviewReadiness(gate(workflow({
  stage: "approval",
  returnVersion: 2,
  reviewerId: "reviewer-1",
  reviewedAt: "2026-02-03T00:00:00.000Z",
  desk: approvedDesk,
}))).readiness, "complete");

const signedOld: EfileAuthorization = {
  id: "auth-1",
  returnId: "return-1",
  signer: "taxpayer",
  returnVersion: 1,
  method: "manual",
  status: "signed",
  signedAt: "2026-02-01T00:00:00.000Z",
  evidence: "Signed copy",
};
assert.equal(getAuthorizationReadiness(gate(workflow({ stage: "approval", returnVersion: 2 }), [], { authorizations: [signedOld] })).readiness, "needs_attention");
assert.equal(getAuthorizationReadiness(gate(workflow({ stage: "approval", returnVersion: 2 }))).readiness, "needs_attention");

const federal: FilingRecord = {
  id: "filing-fed",
  returnId: "return-1",
  jurisdiction: "federal",
  region: "",
  status: "accepted",
  note: "Accepted",
  updatedAt: "2026-03-01T00:00:00.000Z",
};
const stateRejected: FilingRecord = { ...federal, id: "filing-tx", jurisdiction: "state", region: "TX", status: "rejected", note: "Reject code" };
const signedCurrent: EfileAuthorization = { ...signedOld, returnVersion: 1 };
const filingGate = gate(workflow({ stage: "filing" }), [], { filings: [federal, stateRejected], authorizations: [signedCurrent] });
assert.equal(getFilingReadiness(filingGate).readiness, "needs_attention");

const resubmitted = { ...stateRejected, status: "changes" as const, note: "Corrected and ready" };
assert.equal(getFilingReadiness(gate(workflow({ stage: "filing" }), [], { filings: [federal, resubmitted], authorizations: [signedCurrent] })).readiness, "in_progress");

assert.equal(getDeliveryReadiness(gate(workflow({ stage: "delivery" }), [], { filings: [] })).readiness, "blocked");
assert.equal(getDocumentReadiness(gate(workflow({ stage: "filing" }))).readiness, "unknown");
assert.equal(getReviewReadiness(gate(workflow({ stage: "filing", reviewerId: null, reviewedAt: "2026-01-01T00:00:00.000Z" }))).readiness, "needs_attention");
assert.equal(getReviewReadiness(gate(workflow({ stage: "filing", reviewerId: "reviewer-1", reviewedAt: "2026-01-01T00:00:00.000Z" }))).readiness, "unknown");

console.log("return readiness checks passed");
