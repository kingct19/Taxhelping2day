import { isFilingNeed, type FilingNeed } from "@/lib/filing-needs";
import type { TaxpayerType } from "@/lib/types";

export type DeskCheck = { done: boolean; at: string | null };

export type DeskIssue = {
  id: string;
  area: "preparation" | "review";
  title: string;
  detail: string;
  priority: "low" | "normal" | "high";
  assigneeId: string | null;
  blocking: boolean;
  status: "open" | "resolved";
  checkKey: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type ReturnDesk = {
  softwareName: string;
  softwareReference: string;
  softwareStatus: string;
  preparationChecks: Record<string, DeskCheck>;
  reviewChecks: Record<string, DeskCheck>;
  issues: DeskIssue[];
  preparedVersion: number | null;
  reviewedVersion: number | null;
  intakeAnswered: boolean;
  filingNeeds: FilingNeed[];
};

export type CheckItem = { key: string; label: string; required: boolean };

export function emptyDesk(): ReturnDesk {
  return {
    softwareName: "",
    softwareReference: "",
    softwareStatus: "",
    preparationChecks: {},
    reviewChecks: {},
    issues: [],
    preparedVersion: null,
    reviewedVersion: null,
    intakeAnswered: false,
    filingNeeds: [],
  };
}

export function preparationChecklist(type: TaxpayerType): CheckItem[] {
  switch (type) {
    case "individual":
      return [
        { key: "identity", label: "Taxpayer information verified", required: false },
        { key: "status", label: "Filing status and dependents reviewed", required: false },
        { key: "prior", label: "Prior-year return reviewed", required: false },
        { key: "income", label: "Income documents reconciled", required: true },
        { key: "deductions", label: "Deductions and credits reviewed", required: false },
        { key: "estimates", label: "Estimated tax payments verified", required: false },
        { key: "carryovers", label: "Carryovers reviewed", required: false },
        { key: "states", label: "State filing obligations evaluated", required: false },
        { key: "software", label: "Tax software entry completed", required: true },
        { key: "workpapers", label: "Supporting workpapers attached", required: false },
        { key: "done", label: "Preparation completed", required: true },
      ];
    case "business":
      return [
        { key: "entity", label: "Entity information verified", required: false },
        { key: "books", label: "Books and statements reconciled", required: true },
        { key: "income", label: "Income and deductions reviewed", required: false },
        { key: "states", label: "State filing obligations evaluated", required: false },
        { key: "software", label: "Tax software entry completed", required: true },
        { key: "workpapers", label: "Supporting workpapers attached", required: false },
        { key: "done", label: "Preparation completed", required: true },
      ];
    case "nonprofit":
      return [
        { key: "org", label: "Organization information verified", required: false },
        { key: "books", label: "Books and contributions reviewed", required: true },
        { key: "states", label: "State filing obligations evaluated", required: false },
        { key: "software", label: "Tax software entry completed", required: true },
        { key: "workpapers", label: "Supporting workpapers attached", required: false },
        { key: "done", label: "Preparation completed", required: true },
      ];
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

export function reviewChecklist(type: TaxpayerType): CheckItem[] {
  switch (type) {
    case "individual":
      return [
        { key: "identity", label: "Taxpayer information reviewed", required: false },
        { key: "income", label: "Income reconciled with supporting documents", required: true },
        { key: "deductions", label: "Material deductions and credits reviewed", required: false },
        { key: "carryovers", label: "Prior-year carryovers checked", required: false },
        { key: "unusual", label: "Calculations and unusual items reviewed", required: false },
        { key: "states", label: "State return requirements reviewed", required: false },
        { key: "documents", label: "Supporting documentation reviewed", required: false },
        { key: "approved", label: "Final return version approved", required: true },
      ];
    case "business":
      return [
        { key: "entity", label: "Entity information reviewed", required: false },
        { key: "books", label: "Books reconciled with supporting documents", required: true },
        { key: "states", label: "State return requirements reviewed", required: false },
        { key: "unusual", label: "Calculations and unusual items reviewed", required: false },
        { key: "documents", label: "Supporting documentation reviewed", required: false },
        { key: "approved", label: "Final return version approved", required: true },
      ];
    case "nonprofit":
      return [
        { key: "org", label: "Organization information reviewed", required: false },
        { key: "books", label: "Books and contributions reconciled", required: true },
        { key: "states", label: "State return requirements reviewed", required: false },
        { key: "documents", label: "Supporting documentation reviewed", required: false },
        { key: "approved", label: "Final return version approved", required: true },
      ];
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

function isCheck(value: unknown): value is DeskCheck {
  if (!value || typeof value !== "object") return false;
  const row = value as { done?: unknown; at?: unknown };
  return typeof row.done === "boolean" && (row.at === null || typeof row.at === "string");
}

function checks(value: unknown): Record<string, DeskCheck> {
  if (!value || typeof value !== "object") return {};
  const next: Record<string, DeskCheck> = {};
  for (const [key, row] of Object.entries(value)) {
    if (isCheck(row)) next[key] = { done: row.done, at: row.at };
  }
  return next;
}

function isIssue(value: unknown): value is DeskIssue {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<DeskIssue>;
  return typeof row.id === "string"
    && (row.area === "preparation" || row.area === "review")
    && typeof row.title === "string"
    && typeof row.detail === "string"
    && (row.priority === "low" || row.priority === "normal" || row.priority === "high")
    && (row.assigneeId === null || typeof row.assigneeId === "string")
    && typeof row.blocking === "boolean"
    && (row.status === "open" || row.status === "resolved")
    && (row.checkKey === null || typeof row.checkKey === "string")
    && typeof row.createdAt === "string"
    && (row.resolvedAt === null || typeof row.resolvedAt === "string");
}

export function parseDesk(value: unknown): ReturnDesk {
  const blank = emptyDesk();
  if (!value || typeof value !== "object") return blank;
  const row = value as Partial<ReturnDesk>;
  return {
    softwareName: typeof row.softwareName === "string" ? row.softwareName.slice(0, 80) : "",
    softwareReference: typeof row.softwareReference === "string" ? row.softwareReference.slice(0, 80) : "",
    softwareStatus: typeof row.softwareStatus === "string" ? row.softwareStatus.slice(0, 80) : "",
    preparationChecks: checks(row.preparationChecks),
    reviewChecks: checks(row.reviewChecks),
    issues: Array.isArray(row.issues) ? row.issues.filter(isIssue) : [],
    preparedVersion: typeof row.preparedVersion === "number" ? row.preparedVersion : null,
    reviewedVersion: typeof row.reviewedVersion === "number" ? row.reviewedVersion : null,
    intakeAnswered: row.intakeAnswered === true,
    filingNeeds: Array.isArray(row.filingNeeds) ? row.filingNeeds.filter((need): need is FilingNeed => typeof need === "string" && isFilingNeed(need)) : [],
  };
}

export function missingRequiredChecks(items: CheckItem[], saved: Record<string, DeskCheck>): string[] {
  return items.filter((item) => item.required && !saved[item.key]?.done).map((item) => item.label);
}

export function recordedCheckCount(saved: Record<string, DeskCheck>): number {
  return Object.keys(saved).length;
}
