import { isOrganizerItem } from "@/lib/engagement";
import { clientOwes, type RequestThread } from "@/lib/request-thread";
import type { Stage } from "@/lib/return-workflow";
import type { SeasonStage } from "@/lib/season";
import { documentRequests } from "@/lib/season";
import type { StatusTone } from "@/lib/status-tone";
import type {
  DocumentKind,
  DocumentRecord,
  EfileAuthorization,
  FilingRecord,
  Invoice,
  Message,
  Profile,
  RequestState,
  SignatureRecord,
} from "@/lib/types";
import { signerLabel } from "@/lib/next-action";

export const clientStages = ["getting_started", "preparation", "review_sign", "completed"] as const;
export type ClientStage = (typeof clientStages)[number];

export const requirementStatuses = ["needed", "uploaded", "under_review", "accepted", "correction", "not_applicable"] as const;
export type RequirementStatus = (typeof requirementStatuses)[number];

export type LetterSnapshot = "unsigned" | "ready" | "waiting";

export type ClientAction = {
  id: string;
  title: string;
  detail: string;
  href: string;
};

export type RequirementCardModel = {
  id: string;
  title: string;
  detail: string;
  status: RequirementStatus;
  correction: string | null;
  files: DocumentRecord[];
  kind: DocumentKind | null;
  upload: { kind: DocumentKind; title: string } | null;
  respond: { profileId: string; latestId: string } | null;
  allowUnavailable: boolean;
  anchors: string[];
};

const reviewFiling = new Set<FilingRecord["status"]>(["draft", "changes", "signature", "transmitted", "rejected"]);

export function clientStageLabel(stage: ClientStage): string {
  switch (stage) {
    case "getting_started":
      return "Getting started";
    case "preparation":
      return "Preparation";
    case "review_sign":
      return "Review & sign";
    case "completed":
      return "Completed";
    default: {
      const exhaustive: never = stage;
      return exhaustive;
    }
  }
}

export function deriveClientStage(input: {
  returnStage: Stage | null;
  filings: FilingRecord[];
  season: SeasonStage | null;
}): ClientStage {
  const allAccepted = input.filings.length > 0 && input.filings.every((filing) => filing.status === "accepted");
  const reviewOpen = input.filings.some((filing) => reviewFiling.has(filing.status));
  const stage = input.returnStage;
  if (allAccepted) return "completed";
  if (!stage) {
    if (reviewOpen) return "review_sign";
    if (input.season === "documents" || input.season === "ready") return "preparation";
    return "getting_started";
  }
  switch (stage) {
    case "delivery":
    case "renewal":
      return reviewOpen ? "review_sign" : "completed";
    case "review":
    case "approval":
    case "filing":
      return "review_sign";
    case "documents":
    case "preparation":
      return reviewOpen ? "review_sign" : "preparation";
    case "lead":
    case "onboarding":
      return reviewOpen ? "review_sign" : "getting_started";
    default: {
      const exhaustive: never = stage;
      return exhaustive;
    }
  }
}

export function clientFirstName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first || "there";
}

export function pickReturn<T extends { taxYear: number; stage: Stage; archivedAt: string | null }>(returns: T[]): T | null {
  if (returns.length === 0) return null;
  return [...returns].sort((left, right) => {
    const rank = (item: T) => (item.archivedAt || item.stage === "renewal" ? 1 : 0);
    return rank(left) - rank(right) || right.taxYear - left.taxYear;
  })[0];
}

export function firmRequestedPoa(messages: Message[]): boolean {
  return messages.some((message) => {
    if (message.kind === "note" || message.authorRole !== "staff") return false;
    return /form\s*2848|power of attorney/i.test(message.body);
  });
}

export function showPoa(messages: Message[], signatures: SignatureRecord[]): boolean {
  return signatures.some((signature) => signature.kind === "poa") || firmRequestedPoa(messages);
}

export function unreadFromStaff(messages: Message[]): number {
  return messages.filter((message) => message.kind === "message" && message.authorRole === "staff" && message.delivery !== "seen").length;
}

export function visibleActivity(messages: Message[], limit = 8): Message[] {
  return messages
    .filter((message) => message.kind !== "note")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

function letterOutstanding(letter: LetterSnapshot | null, signatures: SignatureRecord[]): ClientAction | null {
  if (signatures.some((signature) => signature.kind === "engagement")) return null;
  if (letter === "ready") {
    return {
      id: "engagement",
      title: "Review your engagement letter",
      detail: "Preparation starts after you sign. This is separate from e-file authorization.",
      href: "/portal/signatures",
    };
  }
  if (letter === "waiting") {
    return {
      id: "engagement",
      title: "Finish signing your engagement letter",
      detail: "Open the email from DocuSeal, then the signed copy will show here.",
      href: "/portal/signatures",
    };
  }
  return {
    id: "engagement",
    title: "Engagement letter",
    detail: "The firm prepares this before work starts. It will be ready to sign here.",
    href: "/portal/signatures",
  };
}

export function clientActions(input: {
  profile: Profile;
  signatures: SignatureRecord[];
  threads: RequestThread[];
  authorizations: EfileAuthorization[];
  filings: FilingRecord[];
  invoice: Invoice | null;
  letter: LetterSnapshot | null;
  poaAsked: boolean;
  returnVersion: number;
}): ClientAction[] {
  const actions: ClientAction[] = [];
  if (!input.profile.name || !input.profile.address || !input.profile.taxIdLast4) {
    actions.push({
      id: "profile",
      title: "Complete your personal information",
      detail: "Your name, address, and taxpayer ID are used on the engagement and any forms we prepare.",
      href: "/portal/profile",
    });
  }
  const letter = letterOutstanding(input.letter, input.signatures);
  if (letter) actions.push(letter);
  for (const thread of input.threads) {
    const state = thread.latest.requestState;
    if (!state || !clientOwes(state)) continue;
    const replacement = state === "replacement";
    actions.push({
      id: `request-${thread.root.id}`,
      title: replacement ? "Replace a document" : thread.root.body,
      detail: replacement ? thread.latest.body : "Upload the file, or tell us if you do not have it.",
      href: `/portal/documents#request-${thread.root.id}`,
    });
  }
  const pending = input.authorizations.filter((item) => item.returnVersion === input.returnVersion && item.status === "needed");
  if (pending.length > 0) {
    const who = pending.map((item) => signerLabel(item.signer).toLowerCase()).join(" and ");
    actions.push({
      id: "efile",
      title: "Sign Form 8879",
      detail: `Authorize e-file for version ${input.returnVersion} (${who}). This is separate from the engagement letter.`,
      href: "/portal/signatures",
    });
  }
  const draft = input.filings.find((filing) => filing.status === "draft" || filing.status === "changes");
  if (draft) {
    actions.push({
      id: `filing-${draft.id}`,
      title: draft.status === "changes" ? "Review the updated return" : "Review your draft return",
      detail: draft.note || "Tell the firm what to change before you authorize e-file.",
      href: "/portal/messages",
    });
  }
  if (input.invoice?.status === "sent") {
    actions.push({
      id: "invoice",
      title: "Pay invoice",
      detail: "Payment instructions from the firm are on this page. The portal does not charge a card.",
      href: "/portal#invoice",
    });
  }
  if (input.poaAsked && !input.signatures.some((signature) => signature.kind === "poa")) {
    actions.push({
      id: "poa",
      title: "Sign Form 2848",
      detail: "A drawn signature does not file this form with the IRS. The firm submits it separately.",
      href: "/portal/signatures#poa",
    });
  }
  return actions;
}

export function requirementStatusLabel(status: RequirementStatus): string {
  switch (status) {
    case "needed":
      return "Needed";
    case "uploaded":
      return "Uploaded";
    case "under_review":
      return "Under review";
    case "accepted":
      return "Accepted";
    case "correction":
      return "Correction requested";
    case "not_applicable":
      return "Not applicable";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function requirementTone(status: RequirementStatus): StatusTone {
  switch (status) {
    case "needed":
    case "correction":
      return "warning";
    case "uploaded":
      return "info";
    case "under_review":
      return "attention";
    case "accepted":
      return "success";
    case "not_applicable":
      return "neutral";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function statusFromRequest(state: RequestState): RequirementStatus {
  switch (state) {
    case "open":
      return "needed";
    case "responded":
    case "unavailable":
      return "under_review";
    case "replacement":
      return "correction";
    case "accepted":
      return "accepted";
    case "waived":
      return "not_applicable";
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

function owns(threads: RequestThread[], id: string): boolean {
  return threads.some((thread) => thread.root.documentId === id || thread.latest.documentId === id);
}

function filesFor(
  kind: DocumentKind | null,
  threads: RequestThread[],
  documents: DocumentRecord[],
  claimed: Set<string>,
  attachmentIds: Set<string>,
): DocumentRecord[] {
  const rows: DocumentRecord[] = [];
  const seen = new Set<string>();
  const add = (document: DocumentRecord | undefined) => {
    if (!document || seen.has(document.id)) return;
    seen.add(document.id);
    rows.push(document);
  };
  if (kind) {
    for (const document of documents) {
      if (document.kind !== kind) continue;
      if (attachmentIds.has(document.id) && !owns(threads, document.id)) continue;
      if (claimed.has(document.id) && !owns(threads, document.id)) continue;
      add(document);
    }
  }
  for (const thread of threads) {
    if (thread.root.documentId) add(documents.find((document) => document.id === thread.root.documentId));
    if (thread.latest.documentId) add(documents.find((document) => document.id === thread.latest.documentId));
  }
  return rows;
}

function matchesRequest(body: string, title: string): boolean {
  return body === title || isOrganizerItem(body, title);
}

function primaryThread(threads: RequestThread[]): RequestThread | undefined {
  const owes = threads.find((thread) => thread.latest.requestState && clientOwes(thread.latest.requestState));
  if (owes) return owes;
  const review = threads.find((thread) => thread.latest.requestState === "responded" || thread.latest.requestState === "unavailable");
  if (review) return review;
  return threads[threads.length - 1];
}

function toCard(input: {
  id: string;
  title: string;
  detail: string;
  kind: DocumentKind | null;
  threads: RequestThread[];
  documents: DocumentRecord[];
  claimed: Set<string>;
  attachmentIds: Set<string>;
  profileId: string;
}): RequirementCardModel {
  const thread = primaryThread(input.threads);
  const state = thread?.latest.requestState ?? null;
  const files = filesFor(input.kind, input.threads, input.documents, input.claimed, input.attachmentIds);
  const status = state ? statusFromRequest(state) : files.length > 0 ? "uploaded" : "needed";
  const owes = state ? clientOwes(state) : false;
  const uploadKind = input.kind ?? "other";
  return {
    id: input.id,
    title: input.title,
    detail: input.detail,
    status,
    correction: status === "correction" ? thread?.latest.body ?? null : null,
    files,
    kind: input.kind,
    upload: !owes && status !== "not_applicable" ? { kind: uploadKind, title: input.title } : null,
    respond: owes && thread ? { profileId: input.profileId, latestId: thread.latest.id } : null,
    allowUnavailable: owes,
    anchors: input.threads.map((item) => item.root.id),
  };
}

export function requirementCards(input: {
  profile: Profile;
  documents: DocumentRecord[];
  threads: RequestThread[];
  attachmentIds?: Iterable<string>;
}): RequirementCardModel[] {
  const attachmentIds = new Set(input.attachmentIds ?? []);
  const claimed = new Set<string>();
  for (const thread of input.threads) {
    if (thread.root.documentId) claimed.add(thread.root.documentId);
    if (thread.latest.documentId) claimed.add(thread.latest.documentId);
  }
  const cards: RequirementCardModel[] = [];
  const used = new Set<string>();
  for (const request of documentRequests(input.profile.taxpayerType)) {
    const matched = input.threads.filter((item) => matchesRequest(item.root.body, request.title));
    for (const thread of matched) used.add(thread.root.id);
    cards.push(
      toCard({
        id: matched[0]?.root.id ?? `kind-${request.kind}`,
        title: request.title,
        detail: request.detail,
        kind: request.kind,
        threads: matched,
        documents: input.documents,
        claimed,
        attachmentIds,
        profileId: input.profile.id,
      }),
    );
  }
  for (const thread of input.threads) {
    if (used.has(thread.root.id) || !thread.latest.requestState) continue;
    const detail = thread.latest.id !== thread.root.id && thread.latest.requestState !== "replacement" ? thread.latest.body : "";
    cards.push(
      toCard({
        id: thread.root.id,
        title: thread.root.body,
        detail,
        kind: null,
        threads: [thread],
        documents: input.documents,
        claimed,
        attachmentIds,
        profileId: input.profile.id,
      }),
    );
  }
  return cards;
}
