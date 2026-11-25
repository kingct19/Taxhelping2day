import type { IntakeAnswers } from "@/lib/filing-needs";
import { emptyIntake } from "@/lib/filing-needs";
import type { Stage, Workflow } from "@/lib/return-workflow";
import { clientOwes, staffOwes, type RequestThread } from "@/lib/request-thread";
import {
  seasonAction,
  seasonDetail,
  seasonFor,
  seasonHeadline,
  seasonHref,
  type CatalogLists,
} from "@/lib/season";
import type {
  DocumentRecord,
  EfileAuthorization,
  EfileSigner,
  FilingRecord,
  FilingStatus,
  Profile,
  RequestBlock,
  SignatureRecord,
} from "@/lib/types";

export type NextStep = {
  headline: string;
  detail: string;
  action: string | null;
  href: string | null;
  urgency: number;
};

function clip(value: string): string {
  return value.trim().slice(0, 500);
}

function blockRank(block: RequestBlock | null | undefined): number {
  switch (block) {
    case "start":
      return 0;
    case "filing":
    case null:
    case undefined:
      return 1;
    case "info":
      return 2;
    default: {
      const exhaustive: never = block;
      return exhaustive;
    }
  }
}

function filingRank(status: FilingStatus): number {
  switch (status) {
    case "rejected":
      return 0;
    case "changes":
      return 1;
    case "signature":
      return 2;
    case "draft":
      return 3;
    case "transmitted":
      return 4;
    case "accepted":
      return 5;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function filingStatusLabel(status: FilingStatus): string {
  switch (status) {
    case "draft":
      return "Draft ready";
    case "changes":
      return "Changes requested";
    case "signature":
      return "Signature needed";
    case "transmitted":
      return "Transmitted";
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function signerLabel(signer: EfileSigner): string {
  switch (signer) {
    case "taxpayer":
      return "Taxpayer";
    case "spouse":
      return "Spouse";
    default: {
      const exhaustive: never = signer;
      return exhaustive;
    }
  }
}

export function filingPlace(record: FilingRecord): string {
  if (record.jurisdiction === "federal") return "Federal";
  if (!record.region) return "State";
  const names: Record<string, string> = {
    AL: "Alabama",
    AR: "Arkansas",
    AZ: "Arizona",
    CA: "California",
    FL: "Florida",
    KS: "Kansas",
    NY: "New York",
    OK: "Oklahoma",
    TN: "Tennessee",
    TX: "Texas",
    VA: "Virginia",
  };
  return names[record.region] ?? record.region;
}

function filingPhrase(record: FilingRecord): string {
  const place = filingPlace(record);
  if (place === "Federal" || place === "State") return place.toLowerCase();
  return place;
}

function urgentFiling(filings: FilingRecord[]): FilingRecord | undefined {
  return [...filings].sort((a, b) => filingRank(a.status) - filingRank(b.status) || a.jurisdiction.localeCompare(b.jurisdiction))[0];
}

function owedThreads(threads: RequestThread[], owes: (state: NonNullable<RequestThread["latest"]["requestState"]>) => boolean): RequestThread[] {
  return threads
    .filter((thread) => thread.latest.requestState && owes(thread.latest.requestState))
    .sort((a, b) => blockRank(a.root.requestBlock) - blockRank(b.root.requestBlock));
}

export function deriveStage(current: Workflow, threads: RequestThread[]): Pick<Workflow, "waitingOn" | "nextAction"> {
  const active = threads.filter((thread) => {
    const state = thread.latest.requestState;
    return state !== "accepted" && state !== "waived" && state != null;
  });
  const staffItem = owedThreads(active, staffOwes)[0];
  if (staffItem?.latest.requestState) {
    return { waitingOn: "staff", nextAction: clip(`Review: ${staffItem.root.body}`) };
  }
  const startClient = active.find((thread) => (thread.root.requestBlock ?? "filing") === "start" && clientOwes(thread.latest.requestState!));
  if (startClient?.latest.requestState) {
    return { waitingOn: "client", nextAction: clip(startClient.root.body) };
  }
  const anyClient = active.find((thread) => clientOwes(thread.latest.requestState!));
  if (anyClient && current.stage !== "delivery" && current.stage !== "renewal") {
    return { waitingOn: null, nextAction: clip(`Still waiting: ${anyClient.root.body}`) };
  }
  const derived = current.waitingOn != null || current.nextAction.startsWith("Review:") || current.nextAction.startsWith("Still waiting:");
  return { waitingOn: null, nextAction: derived ? "" : current.nextAction };
}

export function filingPrompt(record: FilingRecord): string {
  switch (record.status) {
    case "draft":
      return `Send the ${filingPhrase(record)} draft`;
    case "changes":
      return `Update the ${filingPhrase(record)} return from the client's corrections`;
    case "signature":
      return `Collect Form 8879 before e-filing ${filingPhrase(record)}`;
    case "transmitted":
      return `Record the ${filingPhrase(record)} acknowledgement`;
    case "accepted":
      return `Deliver the accepted ${filingPhrase(record)} return`;
    case "rejected":
      return `Correct the rejected ${filingPhrase(record)} return`;
    default: {
      const exhaustive: never = record.status;
      return exhaustive;
    }
  }
}

function currentAuthorizations(authorizations: EfileAuthorization[], version: number): EfileAuthorization[] {
  return authorizations.filter((item) => item.returnVersion === version);
}

export function staffNext(input: {
  name: string;
  due: string | null;
  stage: Stage;
  threads: RequestThread[];
  filings: FilingRecord[];
  authorizations: EfileAuthorization[];
  returnVersion: number;
}): NextStep {
  const review = owedThreads(input.threads, staffOwes)[0];
  if (review?.latest.requestState) {
    return {
      headline: `Review ${input.name}'s response`,
      detail: review.root.body,
      action: "Accept, send back, or waive",
      href: null,
      urgency: 0,
    };
  }
  const filing = urgentFiling(input.filings);
  if (filing?.status === "rejected") {
    return { headline: `Correct the rejected ${filingPhrase(filing)} return`, detail: filing.note, action: null, href: null, urgency: 1 };
  }
  if (filing?.status === "transmitted") {
    return { headline: `Record the ${filingPhrase(filing)} acknowledgement`, detail: filing.note, action: null, href: null, urgency: 2 };
  }
  const waiting = owedThreads(input.threads, clientOwes)[0];
  if (waiting) {
    const due = input.due ? ` Due ${input.due}.` : "";
    return { headline: `Waiting on ${input.name}`, detail: `${waiting.root.body}${due}`, action: null, href: null, urgency: 3 };
  }
  const pending = currentAuthorizations(input.authorizations, input.returnVersion).filter((item) => item.status === "needed");
  const needed = pending.find((item) => item.signer === "taxpayer") ?? pending.find((item) => item.signer === "spouse");
  if (needed) {
    return {
      headline: needed.signer === "spouse" ? `Waiting on ${input.name}'s spouse signature` : `Waiting on ${input.name}'s Form 8879`,
      detail: `Version ${input.returnVersion}. The engagement letter does not authorize e-file.`,
      action: null,
      href: null,
      urgency: 4,
    };
  }
  if (filing && (filing.status === "draft" || filing.status === "changes" || filing.status === "signature")) {
    return { headline: filingPrompt(filing), detail: filing.note, action: null, href: null, urgency: 5 };
  }
  if (filing?.status === "accepted") {
    return { headline: `Deliver the accepted ${filingPhrase(filing)} return`, detail: filing.note, action: null, href: null, urgency: 6 };
  }
  return { headline: stageFallback(input.stage, input.name), detail: "", action: null, href: null, urgency: 7 };
}

function stageFallback(stage: Stage, name: string): string {
  switch (stage) {
    case "lead":
      return `Open the engagement for ${name}`;
    case "onboarding":
      return `Confirm the filing type for ${name}`;
    case "documents":
      return `Review ${name}'s documents, then send the engagement letter`;
    case "preparation":
      return `Prepare ${name}'s return`;
    case "review":
      return `Review ${name}'s return`;
    case "approval":
      return `Collect ${name}'s approval`;
    case "filing":
      return `Finish filing for ${name}`;
    case "delivery":
      return `Deliver ${name}'s return`;
    case "renewal":
      return `Carry ${name} into next year`;
    default: {
      const exhaustive: never = stage;
      return exhaustive;
    }
  }
}

export function clientNext(input: {
  profile: Profile;
  signatures: SignatureRecord[];
  documents: DocumentRecord[];
  threads: RequestThread[];
  filings: FilingRecord[];
  authorizations: EfileAuthorization[];
  returnVersion: number;
  stage: Stage | null;
  intake?: IntakeAnswers;
  catalog?: CatalogLists;
}): NextStep {
  const stage = seasonFor(input.profile, input.signatures, input.documents, input.intake ?? emptyIntake(), input.catalog);
  if (stage === "profile" || stage === "scope") {
    return { headline: seasonHeadline(stage), detail: seasonDetail(stage), action: seasonAction(stage), href: seasonHref(stage), urgency: 0 };
  }
  const waiting = owedThreads(input.threads, clientOwes)[0];
  if (waiting?.latest.requestState) {
    const replacement = waiting.latest.requestState === "replacement" ? waiting.latest.body : waiting.root.body;
    return {
      headline: waiting.latest.requestState === "replacement" ? "Send a replacement" : waiting.root.body,
      detail: replacement,
      action: "Upload it",
      href: `/portal#request-${waiting.root.id}`,
      urgency: 1,
    };
  }
  if (stage === "letter" || stage === "documents") {
    return { headline: seasonHeadline(stage), detail: seasonDetail(stage), action: seasonAction(stage), href: seasonHref(stage), urgency: 2 };
  }
  const pending = currentAuthorizations(input.authorizations, input.returnVersion).filter((item) => item.status === "needed");
  const needed = pending.find((item) => item.signer === "taxpayer") ?? pending.find((item) => item.signer === "spouse");
  if (needed) {
    return {
      headline: needed.signer === "spouse" ? "Your spouse still needs to authorize e-file" : "Sign Form 8879",
      detail: `This is for return version ${input.returnVersion}. It is separate from the engagement letter and Form 2848.`,
      action: "Authorize this version",
      href: "/portal/efile",
      urgency: 3,
    };
  }
  const filing = urgentFiling(input.filings);
  if (filing?.status === "changes" || filing?.status === "draft") {
    return {
      headline: "Read the draft",
      detail: filing.note || "Tell the firm what to change before you authorize e-file.",
      action: "Send a correction",
      href: "/portal#message",
      urgency: 4,
    };
  }
  if (filing?.status === "signature") {
    return {
      headline: "We have your authorization for this version",
      detail: "The firm will transmit after checking it. You do not need to sign again unless the numbers change.",
      action: null,
      href: null,
      urgency: 5,
    };
  }
  if (filing?.status === "rejected" || filing?.status === "transmitted") {
    const rejected = filing.status === "rejected";
    return {
      headline: rejected ? "We are correcting a rejected filing" : "Your return is being filed",
      detail: filing.note || (rejected ? "Nothing is needed from you unless we ask." : "We will record the acknowledgement here."),
      action: null,
      href: null,
      urgency: 5,
    };
  }
  if (filing?.status === "accepted") {
    return {
      headline: `Your ${filingPhrase(filing)} return was accepted`,
      detail: filing.note || "The filed copy stays in your documents.",
      action: null,
      href: null,
      urgency: 6,
    };
  }
  if (input.stage === "preparation" || input.stage === "review") {
    return {
      headline: "We are preparing your return",
      detail: "You do not need to do anything unless we ask for a document.",
      action: null,
      href: null,
      urgency: 7,
    };
  }
  if (input.stage === "approval") {
    return {
      headline: "Your return is ready for review",
      detail: "Read the draft when we send it, then sign Form 8879.",
      action: null,
      href: null,
      urgency: 7,
    };
  }
  if (input.stage === "delivery" || input.stage === "renewal") {
    return {
      headline: "Your return has been delivered",
      detail: "The filed copy stays in your documents. Payment instructions are with the invoice.",
      action: null,
      href: null,
      urgency: 6,
    };
  }
  const inReview = input.threads.some((thread) => thread.latest.requestState && staffOwes(thread.latest.requestState));
  if (inReview || stage === "ready") {
    return {
      headline: inReview ? "We are reviewing what you sent" : seasonHeadline("ready"),
      detail: inReview ? "You do not need to upload it again." : "You submitted this package. The firm still has to accept it.",
      action: null,
      href: null,
      urgency: 7,
    };
  }
  return { headline: seasonHeadline(stage), detail: seasonDetail(stage), action: seasonAction(stage), href: seasonHref(stage), urgency: 8 };
}
