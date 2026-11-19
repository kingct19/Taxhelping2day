import type { DocumentKind, DocumentRecord, Profile, SignatureRecord, TaxpayerType } from "@/lib/types";

export const seasonStages = ["profile", "letter", "documents", "ready"] as const;
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

export function documentRequests(type: TaxpayerType): DocumentRequest[] {
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

export function seasonFor(profile: Profile, signatures: SignatureRecord[], documents: DocumentRecord[]): SeasonStage {
  if (!profile.name || !profile.address || !profile.taxIdLast4) return "profile";
  if (!signatures.some((signature) => signature.kind === "engagement")) return "letter";
  const missing = documentRequests(profile.taxpayerType).some(
    (request) => request.required && !receivedRequest(request, documents),
  );
  if (missing) return "documents";
  return "ready";
}

export function isSeasonStage(value: string): value is SeasonStage {
  return seasonStages.some((stage) => stage === value);
}

export function seasonLabel(stage: SeasonStage): string {
  switch (stage) {
    case "profile":
      return "Your details";
    case "letter":
      return "Engagement letter";
    case "documents":
      return "Documents";
    case "ready":
      return "Ready for intake review";
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
    case "letter":
      return "Sign your engagement letter";
    case "documents":
      return "Send the records for this return";
    case "ready":
      return "Your intake is ready for review";
    default: {
      const exhaustive: never = stage;
      return exhaustive;
    }
  }
}

export function seasonDetail(stage: SeasonStage): string {
  switch (stage) {
    case "profile":
      return "Your name, address, and taxpayer ID fill the engagement letter and Form 2848. Enter them once.";
    case "letter":
      return "Preparation starts after you sign. The letter names the work and the fee.";
    case "documents":
      return "Upload what is still open below. W-2s and 1099s can wait if you did not receive any.";
    case "ready":
      return "You submitted this package. The firm still has to accept it.";
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
    case "letter":
      return "Review and sign";
    case "documents":
      return "Upload documents";
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
    case "letter":
      return "/portal/engagement";
    case "documents":
      return "/portal/documents";
    case "ready":
      return "/portal#message";
    default: {
      const exhaustive: never = stage;
      return exhaustive;
    }
  }
}

export function missingRequired(profile: Profile, documents: DocumentRecord[]): string[] {
  return documentRequests(profile.taxpayerType)
    .filter((request) => request.required && !receivedRequest(request, documents))
    .map((request) => request.title);
}
