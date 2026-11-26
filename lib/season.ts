import type { FilingNeed, IntakeAnswers } from "@/lib/filing-needs";
import { emptyIntake } from "@/lib/filing-needs";
import { clientOwes, type RequestThread } from "@/lib/request-thread";
import { filingTypesOf, isTaxpayerType, type DocumentKind, type DocumentRecord, type Profile, type SignatureRecord, type TaxpayerType } from "@/lib/types";

export const seasonStages = ["profile", "scope", "documents", "letter", "ready"] as const;
export type SeasonStage = (typeof seasonStages)[number];

export type DocumentRequest = {
  kind: DocumentKind;
  title: string;
  detail: string;
  required: boolean;
};

const photoId: DocumentRequest = {
  kind: "photo_id",
  title: "Photo ID",
  detail: "A current identification card, so we know who we are preparing for.",
  required: true,
};

const priorReturn: DocumentRequest = {
  kind: "prior_return",
  title: "Last year's return",
  detail: "So filing status, depreciation, and carryovers come forward.",
  required: true,
};

function extraRequest(title: string, detail: string): DocumentRequest {
  return { kind: "other", title, detail, required: true };
}

function scopedDocumentRequests(type: TaxpayerType, needs: FilingNeed[]): DocumentRequest[] {
  const selected = new Set(needs);
  const extras: DocumentRequest[] = [];
  const add = (need: FilingNeed, request: DocumentRequest) => {
    if (selected.has(need)) extras.push(request);
  };
  switch (type) {
    case "individual":
      add("wages", { kind: "w2", title: "W-2s", detail: "Every wage statement you received.", required: true });
      if (selected.has("retirement") || selected.has("investments")) {
        extras.push({ kind: "1099", title: "1099s", detail: "Retirement, interest, and brokerage forms for the items you selected.", required: true });
      }
      add("self_employment", extraRequest("Self-employment records", "Income and expenses for the work you run yourself."));
      add("rental", extraRequest("Rental records", "Rent received and the expenses for each property."));
      add("mortgage", extraRequest("Mortgage interest", "Form 1098 or the lender's year-end statement."));
      add("dependents", extraRequest("Dependent information", "Records for the people you claim."));
      break;
    case "business":
      add("books", { kind: "other", title: "Books and statements", detail: "Year-end books, or the bank and card statements the books will come from.", required: true });
      add("payroll", extraRequest("Payroll reports", "Payroll reports for the year."));
      add("assets", extraRequest("Fixed asset schedule", "Equipment and other assets bought, sold, or still in use."));
      add("loans", extraRequest("Loan statements", "Loan balances and interest for the year."));
      break;
    case "nonprofit":
      add("books", { kind: "other", title: "Organization books", detail: "Contributions, expenses, and last year's information return.", required: true });
      break;
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
  return [photoId, priorReturn, ...extras];
}

export function standardDocuments(type: TaxpayerType): DocumentRequest[] {
  switch (type) {
    case "individual":
      return [
        photoId,
        priorReturn,
        { kind: "w2", title: "W-2s", detail: "Every wage statement from a job. Skip this if there were no wages.", required: false },
        { kind: "1099", title: "1099s", detail: "Interest, dividends, retirement, and contract income, if any.", required: false },
      ];
    case "business":
      return [
        { kind: "other", title: "Photo ID of the responsible person", detail: "A current identification card for the person who signs the business return.", required: true },
        { kind: "other", title: "EIN letter", detail: "The IRS letter that assigned the employer identification number.", required: true },
        { kind: "prior_return", title: "Last year's Form 1120", detail: "The business return filed last year. Skip this for a new entity.", required: false },
        { kind: "other", title: "Profit and loss", detail: "Income and expenses for the year.", required: true },
        { kind: "other", title: "Balance sheet", detail: "Assets, liabilities, and equity at year end.", required: true },
        { kind: "other", title: "Bank and card statements", detail: "Statements for every business account, if the books are not enough.", required: false },
      ];
    case "nonprofit":
      return [
        { kind: "other", title: "Photo ID of an officer", detail: "A current identification card for an officer who signs the return.", required: true },
        { kind: "other", title: "IRS determination letter", detail: "The letter that recognizes the organization as tax-exempt.", required: true },
        { kind: "prior_return", title: "Last year's Form 990", detail: "The information return filed last year. Skip this for a new organization.", required: false },
        { kind: "other", title: "Revenue and expenses", detail: "The year's statement of activities.", required: true },
        { kind: "other", title: "Contribution records", detail: "Gifts, grants, and donor records, if the organization received any.", required: false },
        { kind: "other", title: "Program expenses", detail: "What the organization spent on its programs.", required: true },
      ];
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

export type CatalogLists = {
  types: { id: string; documents: DocumentRequest[] }[];
};

export function documentsForId(id: string, catalog?: CatalogLists): DocumentRequest[] {
  const listed = catalog?.types.find((type) => type.id === id)?.documents;
  if (listed) return listed;
  if (isTaxpayerType(id)) return standardDocuments(id);
  return [];
}

export function documentsForIds(ids: readonly string[], catalog?: CatalogLists): DocumentRequest[] {
  const merged = new Map<string, DocumentRequest>();
  for (const id of ids) {
    for (const request of documentsForId(id, catalog)) {
      const existing = merged.get(request.title);
      if (!existing) merged.set(request.title, { ...request });
      else if (request.required) existing.required = true;
    }
  }
  return [...merged.values()];
}

export function documentsForTypes(types: readonly TaxpayerType[]): DocumentRequest[] {
  const merged = new Map<string, DocumentRequest>();
  for (const type of types) {
    for (const request of standardDocuments(type)) {
      const existing = merged.get(request.title);
      if (!existing) merged.set(request.title, { ...request });
      else if (request.required) existing.required = true;
    }
  }
  return [...merged.values()];
}

export function documentRequests(type: TaxpayerType, needs?: FilingNeed[]): DocumentRequest[] {
  if (needs) return scopedDocumentRequests(type, needs);

  switch (type) {
    case "individual":
      return [
        photoId,
        priorReturn,
        {
          kind: "w2",
          title: "W-2s",
          detail: "Every wage statement you received. Skip this if you had no wages.",
          required: false,
        },
        {
          kind: "1099",
          title: "1099s",
          detail: "Interest, retirement, contract, and brokerage forms, if you received any.",
          required: false,
        },
      ];
    case "business":
      return [
        photoId,
        priorReturn,
        {
          kind: "other",
          title: "Books and statements",
          detail: "Year-end books, or the bank and card statements the books will come from.",
          required: true,
        },
        {
          kind: "1099",
          title: "1099s",
          detail: "Forms issued to the business, if any.",
          required: false,
        },
      ];
    case "nonprofit":
      return [
        photoId,
        priorReturn,
        {
          kind: "other",
          title: "Organization books",
          detail: "Contributions, expenses, and last year's information return.",
          required: true,
        },
      ];
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

export function receivedRequest(request: DocumentRequest, documents: DocumentRecord[]): boolean {
  return documents.some((document) => document.kind === request.kind);
}

function threadMatches(body: string, title: string): boolean {
  return body === title || body.startsWith(`Organizer: ${title}.`);
}

export function returnStillNeedsDocuments(requests: DocumentRequest[], documents: DocumentRecord[], threads: RequestThread[]): boolean {
  const used = new Set<string>();
  return requests.some((request) => {
    if (!request.required) return false;
    const matched = threads.filter((thread) => threadMatches(thread.root.body, request.title));
    if (matched.some((thread) => thread.latest.requestState && clientOwes(thread.latest.requestState))) return true;
    if (matched.some((thread) => thread.latest.requestState && !clientOwes(thread.latest.requestState))) return false;
    const file = documents.find((document) => document.kind === request.kind && !used.has(document.id));
    if (!file) return true;
    used.add(file.id);
    return false;
  });
}

function missingRequests(requests: DocumentRequest[], documents: DocumentRecord[]): boolean {
  const remaining = new Map<DocumentKind, number>();
  for (const document of documents) remaining.set(document.kind, (remaining.get(document.kind) ?? 0) + 1);
  return requests.some((request) => {
    if (!request.required) return false;
    const left = remaining.get(request.kind) ?? 0;
    if (left <= 0) return true;
    remaining.set(request.kind, left - 1);
    return false;
  });
}

export function seasonFor(
  profile: Profile,
  signatures: SignatureRecord[],
  documents: DocumentRecord[],
  intake: IntakeAnswers = emptyIntake(),
  catalog?: CatalogLists,
  scope?: { threads: RequestThread[]; filingTypeId: string },
): SeasonStage {
  if (!profile.name || !profile.address || !profile.taxIdLast4) return "profile";
  const signed = signatures.some((signature) => signature.kind === "engagement");
  const requests = scope
    ? intake.answered
      ? documentsForId(scope.filingTypeId, catalog)
      : isTaxpayerType(scope.filingTypeId)
        ? documentRequests(scope.filingTypeId)
        : documentRequests(profile.taxpayerType)
    : intake.answered
      ? documentsForIds(filingTypesOf(profile), catalog)
      : documentRequests(profile.taxpayerType);
  const missing = scope ? returnStillNeedsDocuments(requests, documents, scope.threads) : missingRequests(requests, documents);
  if (signed) return missing ? "documents" : "ready";
  if (!intake.answered) return "scope";
  if (missing) return "documents";
  return "letter";
}

export function isSeasonStage(value: string): value is SeasonStage {
  return seasonStages.some((stage) => stage === value);
}

export function seasonLabel(stage: SeasonStage): string {
  switch (stage) {
    case "profile":
      return "Your details";
    case "scope":
      return "What you are filing";
    case "documents":
      return "Documents";
    case "letter":
      return "Engagement letter";
    case "ready":
      return "Ready to prepare";
    default: {
      const exhaustive: never = stage;
      return exhaustive;
    }
  }
}

export function seasonHeadline(stage: SeasonStage): string {
  switch (stage) {
    case "profile":
      return "Start with your details";
    case "scope":
      return "Tell us what you are filing";
    case "documents":
      return "Send the records for this return";
    case "letter":
      return "Sign your engagement letter";
    case "ready":
      return "Your return is ready for preparation";
    default: {
      const exhaustive: never = stage;
      return exhaustive;
    }
  }
}

export function seasonDetail(stage: SeasonStage): string {
  switch (stage) {
    case "profile":
      return "Your name, address, and taxpayer ID are used on the engagement letter and any forms we prepare. Enter them once.";
    case "scope":
      return "Choose every return you are filing. A job and a business are both listed, and each one has its own document list.";
    case "documents":
      return "Upload the records for what you are filing. The firm reviews them before sending the engagement letter.";
    case "letter":
      return "The firm sends this after reviewing your documents. Preparation starts after you sign. The letter names the work and the fee.";
    case "ready":
      return "The letter is signed and the records are in. Preparation can start.";
    default: {
      const exhaustive: never = stage;
      return exhaustive;
    }
  }
}

export function seasonAction(stage: SeasonStage): string {
  switch (stage) {
    case "profile":
      return "Enter your details";
    case "scope":
      return "Choose what you are filing";
    case "documents":
      return "Upload documents";
    case "letter":
      return "Review and sign";
    case "ready":
      return "Message the firm";
    default: {
      const exhaustive: never = stage;
      return exhaustive;
    }
  }
}

export function seasonHref(stage: SeasonStage): string {
  switch (stage) {
    case "profile":
      return "/portal/profile";
    case "scope":
      return "/portal/documents#filing";
    case "documents":
      return "/portal/documents";
    case "letter":
      return "/portal/engagement";
    case "ready":
      return "/portal#message";
    default: {
      const exhaustive: never = stage;
      return exhaustive;
    }
  }
}

export function missingRequired(profile: Profile, documents: DocumentRecord[], intake: IntakeAnswers = emptyIntake(), catalog?: CatalogLists): string[] {
  const requests = intake.answered ? documentsForIds(filingTypesOf(profile), catalog) : documentRequests(profile.taxpayerType);
  const remaining = new Map<DocumentKind, number>();
  for (const document of documents) remaining.set(document.kind, (remaining.get(document.kind) ?? 0) + 1);
  return requests.filter((request) => {
    if (!request.required) return false;
    const left = remaining.get(request.kind) ?? 0;
    if (left <= 0) return true;
    remaining.set(request.kind, left - 1);
    return false;
  }).map((request) => request.title);
}
