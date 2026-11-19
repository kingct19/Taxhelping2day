import type { TaxpayerType } from "@/lib/types";
import type { SeasonStage } from "@/lib/season";

export const inboxFolderIds = [
  "all",
  "profile",
  "letter",
  "documents",
  "ready",
  "poa",
  "identity",
  "individual",
  "business",
  "nonprofit",
  "starred",
  "snoozed",
] as const;

export type InboxFolderId = (typeof inboxFolderIds)[number];

export type InboxRow = {
  id: string;
  name: string;
  email: string;
  taxpayerType: TaxpayerType;
  stage: SeasonStage;
  createdAt: string;
  poaSigned: boolean;
  identityChecked: boolean;
  starred: boolean;
  snoozedUntil: string | null;
};

export function isSnoozed(row: Pick<InboxRow, "snoozedUntil">, now = Date.now()) {
  return row.snoozedUntil !== null && new Date(row.snoozedUntil).getTime() > now;
}

export function isInboxFolder(value: string): value is InboxFolderId {
  return inboxFolderIds.some((folder) => folder === value);
}

export function inboxFolderLabel(folder: InboxFolderId): string {
  switch (folder) {
    case "all":
      return "All files";
    case "profile":
      return "Details";
    case "letter":
      return "Engagement letter";
    case "documents":
      return "Documents";
    case "ready":
      return "Ready to prepare";
    case "poa":
      return "Form 2848 open";
    case "identity":
      return "Identity open";
    case "individual":
      return "Individuals";
    case "business":
      return "Businesses";
    case "nonprofit":
      return "Non-profits";
    case "starred":
      return "Starred";
    case "snoozed":
      return "Snoozed";
    default: {
      const exhaustive: never = folder;
      return exhaustive;
    }
  }
}

export function inboxHref(folder: InboxFolderId, id?: string) {
  const params = new URLSearchParams();
  if (folder !== "all") params.set("folder", folder);
  if (id) params.set("id", id);
  const query = params.toString();
  return query ? `/inbox?${query}` : "/inbox";
}

export function matchesInboxFolder(row: InboxRow, folder: InboxFolderId): boolean {
  switch (folder) {
    case "all":
      return !isSnoozed(row);
    case "starred":
      return row.starred && !isSnoozed(row);
    case "snoozed":
      return isSnoozed(row);
    case "profile":
    case "letter":
    case "documents":
    case "ready":
      return row.stage === folder && !isSnoozed(row);
    case "poa":
      return !row.poaSigned && !isSnoozed(row);
    case "identity":
      return !row.identityChecked && !isSnoozed(row);
    case "individual":
    case "business":
    case "nonprofit":
      return row.taxpayerType === folder && !isSnoozed(row);
    default: {
      const exhaustive: never = folder;
      return exhaustive;
    }
  }
}
