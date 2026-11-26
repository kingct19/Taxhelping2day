import { emptyDesk, parseDesk, type ReturnDesk } from "@/lib/return-desk";
import type { TaxReturn } from "@/lib/types";
import { isLeadSource, isServiceLine, type LeadSource, type ServiceLine } from "@/lib/types";

export const stages = {
  lead: "Lead",
  onboarding: "Onboarding",
  documents: "Documents",
  preparation: "Preparation",
  review: "Review",
  approval: "Approval",
  filing: "Filing",
  delivery: "Delivery",
  renewal: "Renewal",
  canceled: "Canceled",
} as const;

export const stageOrder = [
  "lead",
  "onboarding",
  "documents",
  "preparation",
  "review",
  "approval",
  "filing",
  "delivery",
  "renewal",
] as const;

export type Stage = keyof typeof stages;

export type WaitingOn = "client" | "staff" | null;

export type Workflow = {
  stage: Stage;
  owner: string | null;
  due: string | null;
  nextAction: string;
  waitingOn: WaitingOn;
  source: LeadSource;
  services: ServiceLine[];
  reviewerId: string | null;
  reviewedAt: string | null;
  deliveredAt: string | null;
  archivedAt: string | null;
  revision: number;
  desk: ReturnDesk;
  stageEnteredAt: string;
};

export type TeamReturn = TaxReturn & Workflow;

export const initialWorkflow: Workflow = {
  stage: "lead",
  owner: null,
  due: null,
  nextAction: "",
  waitingOn: null,
  source: "inquiry",
  services: [],
  reviewerId: null,
  reviewedAt: null,
  deliveredAt: null,
  archivedAt: null,
  revision: 0,
  desk: emptyDesk(),
  stageEnteredAt: "",
};

export function isStage(value: string): value is Stage {
  return Object.hasOwn(stages, value);
}

/** A client close, including older closes that were only archived. */
export function shownStage(item: { stage: Stage; archivedAt: string | null }): Stage {
  if (item.stage === "canceled") return "canceled";
  if (item.archivedAt && clientMayCancel(item.stage)) return "canceled";
  return item.stage;
}

export function clientMayCancel(stage: Stage): boolean {
  switch (stage) {
    case "lead":
    case "onboarding":
    case "documents":
      return true;
    case "preparation":
    case "review":
    case "approval":
    case "filing":
    case "delivery":
    case "renewal":
    case "canceled":
      return false;
    default: {
      const exhaustive: never = stage;
      return exhaustive;
    }
  }
}

export function stageIndex(stage: Stage): number {
  return stageOrder.findIndex((item) => item === stage);
}

export function nextStage(stage: Stage): Stage | null {
  const index = stageIndex(stage);
  if (index < 0 || index >= stageOrder.length - 1) return null;
  return stageOrder[index + 1];
}

export function sendBackTarget(stage: Stage): Stage | null {
  switch (stage) {
    case "review":
      return "preparation";
    case "approval":
      return "review";
    case "filing":
      return "preparation";
    case "lead":
    case "onboarding":
    case "documents":
    case "preparation":
    case "delivery":
    case "renewal":
    case "canceled":
      return null;
    default: {
      const exhaustive: never = stage;
      return exhaustive;
    }
  }
}

export function serviceLabel(line: ServiceLine): string {
  switch (line) {
    case "tax_return":
      return "Tax return";
    case "bookkeeping":
      return "Bookkeeping";
    case "payroll":
      return "Payroll";
    case "estimates":
      return "Estimates";
    case "planning":
      return "Planning";
    default: {
      const exhaustive: never = line;
      return exhaustive;
    }
  }
}

export function sourceLabel(source: LeadSource): string {
  switch (source) {
    case "inquiry":
      return "Inquiry";
    case "referral":
      return "Referral";
    case "returning":
      return "Returning client";
    default: {
      const exhaustive: never = source;
      return exhaustive;
    }
  }
}

export const clientSteps = [
  { id: "details", label: "Your details" },
  { id: "letter", label: "Engagement letter" },
  { id: "documents", label: "Documents" },
  { id: "preparing", label: "In preparation" },
  { id: "approval", label: "Review and sign" },
  { id: "filing", label: "Filing" },
  { id: "delivered", label: "Delivered" },
] as const;

type LegacyInput = Partial<Workflow> & { stage?: string | null; resumeStage?: string | null };

function mapLegacy(stage: string | null | undefined, resume: string | null | undefined): { stage: Stage; waitingOn: WaitingOn } {
  switch (stage) {
    case "intake":
      return { stage: "documents", waitingOn: "staff" };
    case "waiting":
      return { stage: legacyResume(resume), waitingOn: "client" };
    case "preparation":
      return { stage: "preparation", waitingOn: null };
    case "review":
      return { stage: "review", waitingOn: null };
    case "followup":
      return { stage: "filing", waitingOn: null };
    case "closed":
      return { stage: "delivery", waitingOn: null };
    default:
      return { stage: "lead", waitingOn: null };
  }
}

function legacyResume(resume: string | null | undefined): Stage {
  switch (resume) {
    case "preparation":
    case "review":
      return resume;
    case "followup":
      return "filing";
    case "closed":
      return "delivery";
    case "intake":
    case "waiting":
    case null:
    case undefined:
      return "documents";
    default:
      return isStage(resume) ? resume : "documents";
  }
}

export function asWorkflow(item: LegacyInput): Workflow {
  const current = item.stage && isStage(item.stage);
  const mapped = mapLegacy(item.stage, item.resumeStage);
  const waitingOn = item.waitingOn === "client" || item.waitingOn === "staff" ? item.waitingOn : current ? null : mapped.waitingOn;
  return {
    stage: current && item.stage && isStage(item.stage) ? item.stage : mapped.stage,
    owner: item.owner ?? null,
    due: item.due ?? null,
    nextAction: item.nextAction ?? "",
    waitingOn,
    source: item.source && isLeadSource(item.source) ? item.source : "inquiry",
    services: Array.isArray(item.services) ? item.services.filter(isServiceLine) : [],
    reviewerId: item.reviewerId ?? null,
    reviewedAt: item.reviewedAt ?? null,
    deliveredAt: item.deliveredAt ?? null,
    archivedAt: item.archivedAt ?? null,
    revision: item.revision ?? 0,
    desk: parseDesk(item.desk),
    stageEnteredAt: item.stageEnteredAt ?? "",
  };
}
