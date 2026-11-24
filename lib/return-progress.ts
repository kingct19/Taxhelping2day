import { advanceBlocker, sendBackBlocker, type GateInput } from "@/lib/engagement";
import { filingPlace } from "@/lib/next-action";
import { clientOwes, staffOwes } from "@/lib/request-thread";
import { nextStage, sendBackTarget, stages, stageOrder, type Stage } from "@/lib/return-workflow";
import type { Message } from "@/lib/types";

export const returnTabs = ["overview", "documents", "preparation", "review", "filing", "activity"] as const;
export type ReturnTab = (typeof returnTabs)[number];

export function isReturnTab(value: string | undefined): value is ReturnTab {
  return returnTabs.some((tab) => tab === value);
}

export const trackSteps = [
  { id: "documents", label: "Documents", stage: "documents" },
  { id: "preparation", label: "Preparation", stage: "preparation" },
  { id: "review", label: "Internal Review", stage: "review" },
  { id: "approval", label: "Client Authorization", stage: "approval" },
  { id: "filing", label: "Filing", stage: "filing" },
  { id: "delivery", label: "Delivery", stage: "delivery" },
] as const;

export type TrackVisual = "complete" | "active" | "pending" | "blocked";

export const returnFieldClass = "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm";

export function trackName(stage: Stage): string | null {
  return trackSteps.find((step) => step.stage === stage)?.label ?? null;
}

export function trackVisual(stage: Stage, step: Stage, blocked: boolean): TrackVisual {
  if (stage === "renewal") return "complete";
  if (stage === "lead" || stage === "onboarding") return "pending";
  const current = stageOrder.indexOf(stage);
  const index = stageOrder.indexOf(step);
  if (index < current) return "complete";
  if (index === current) return blocked ? "blocked" : "active";
  return "pending";
}

export function returnIsBlocked(input: GateInput): boolean {
  if (advanceBlocker({ ...input, note: "" })) return true;
  return input.threads.some((thread) => {
    const state = thread.latest.requestState;
    if (!state || !clientOwes(state)) return false;
    return thread.root.requestBlock === "start" || thread.root.requestBlock === "filing";
  });
}

export function blockerLines(input: GateInput): string[] {
  const lines: string[] = [];
  const gate = advanceBlocker({ ...input, note: "" });
  if (gate) lines.push(gate);
  for (const thread of input.threads) {
    const state = thread.latest.requestState;
    if (!state) continue;
    if (staffOwes(state)) lines.push(`Review needed: ${thread.root.body}`);
    if (clientOwes(state) && (thread.root.requestBlock === "start" || thread.root.requestBlock === "filing")) {
      lines.push(thread.root.body);
    }
  }
  for (const filing of input.filings) {
    if (filing.status === "rejected") {
      lines.push(filing.note ? `Rejected ${filingPlace(filing)}: ${filing.note}` : `Rejected ${filingPlace(filing)}`);
    }
  }
  return [...new Set(lines)];
}

export function advanceOffer(input: GateInput): { label: string; needsNote: boolean } | null {
  const stage = input.workflow.stage;
  const upcoming = nextStage(stage);
  if (!upcoming || stage === "renewal") return null;
  const probe = advanceBlocker({ ...input, note: stage === "review" ? "Reviewed." : "" });
  if (probe) return null;
  return { label: moveLabel(stage, upcoming), needsNote: stage === "review" };
}

export function sendBackOffer(input: GateInput): { label: string } | null {
  const target = sendBackTarget(input.workflow.stage);
  if (!target || sendBackBlocker(input.workflow.stage, input.filings)) return null;
  const name = trackName(target) ?? stages[target];
  return { label: `Send back to ${name}` };
}

function moveLabel(stage: Stage, upcoming: Stage): string {
  if (stage === "delivery") return "Deliver and archive";
  if (stage === "review") return "Approve return";
  return `Move to ${trackName(upcoming) ?? stages[upcoming]}`;
}

export function tabForStage(stage: Stage): ReturnTab {
  switch (stage) {
    case "lead":
    case "onboarding":
    case "renewal":
      return "overview";
    case "documents":
      return "documents";
    case "preparation":
      return "preparation";
    case "review":
    case "approval":
      return "review";
    case "filing":
    case "delivery":
      return "filing";
    default: {
      const exhaustive: never = stage;
      return exhaustive;
    }
  }
}

export function tabForNext(urgency: number, stage: Stage): ReturnTab {
  switch (urgency) {
    case 0:
    case 3:
      return "documents";
    case 1:
    case 2:
    case 5:
    case 6:
      return "filing";
    case 4:
      return "review";
    case 7:
      return tabForStage(stage);
    default:
      return "overview";
  }
}

export function returnTabHref(profileId: string, returnId: string, tab: ReturnTab): string {
  return `/returns/${profileId}/${returnId}?tab=${tab}`;
}

export function formatDollars(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${sign}${whole}.${fraction}`;
}

export function shortDate(value: string): string {
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function shortDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export type ActivityToneName = "neutral" | "info" | "success" | "warning" | "danger";

export const activityIconNames = [
  "authorization",
  "filing",
  "delivery",
  "stage",
  "review-approval",
  "review",
  "review-reopened",
  "review-checklist",
  "preparation-submitted",
  "preparation-issue",
  "preparation-checklist",
  "tax-software",
  "assigned",
  "cleared-preparer",
  "cleared-reviewer",
  "due-date",
  "due-date-cleared",
  "document-review",
  "client-request",
  "organizer",
  "uploaded",
  "unavailable",
  "replacement",
  "accepted",
  "waived",
  "document",
  "note",
  "update",
  "message",
] as const;
export type ActivityIconName = (typeof activityIconNames)[number];

export function describeActivity(message: Pick<Message, "kind" | "body">): { label: string; tone: ActivityToneName; icon: ActivityIconName } {
  const body = message.body;
  if (body.includes("Form 8879") || body.includes("Return version")) return { label: "Authorization", tone: "info", icon: "authorization" };
  if (body.startsWith("Recorded ") && body.includes("firm entered")) return { label: "Filing status", tone: "warning", icon: "filing" };
  if (body.startsWith("Delivered")) return { label: "Delivery", tone: "success", icon: "delivery" };
  if (body.startsWith("Sent back")) return { label: "Stage change", tone: "warning", icon: "stage" };
  if (body.startsWith("Reviewer approval")) return { label: "Review approval", tone: "success", icon: "review-approval" };
  if (body.startsWith("Review reopened")) return { label: "Review", tone: "warning", icon: "review-reopened" };
  if (body.startsWith("Review checklist")) return { label: "Review", tone: "warning", icon: "review-checklist" };
  if (body.startsWith("Review correction")) return { label: "Review", tone: "warning", icon: "review" };
  if (body.startsWith("Preparation submitted")) return { label: "Preparation", tone: "info", icon: "preparation-submitted" };
  if (body.startsWith("Preparation issue")) return { label: "Preparation", tone: "info", icon: "preparation-issue" };
  if (body.startsWith("Preparation checklist")) return { label: "Preparation", tone: "info", icon: "preparation-checklist" };
  if (body.startsWith("Tax software")) return { label: "Preparation", tone: "info", icon: "tax-software" };
  if (body.startsWith("Assigned")) return { label: "Assignment", tone: "neutral", icon: "assigned" };
  if (body.startsWith("Cleared the preparer")) return { label: "Assignment", tone: "neutral", icon: "cleared-preparer" };
  if (body.startsWith("Cleared the reviewer")) return { label: "Assignment", tone: "neutral", icon: "cleared-reviewer" };
  if (body.startsWith("Set the due date")) return { label: "Assignment", tone: "neutral", icon: "due-date" };
  if (body.startsWith("Cleared the due date")) return { label: "Assignment", tone: "neutral", icon: "due-date-cleared" };
  if (body.startsWith("Reviewed for")) return { label: "Document review", tone: "success", icon: "document-review" };
  if (body.includes("Requested from client")) return { label: "Client request", tone: "info", icon: "client-request" };
  if (body.startsWith("Organizer:")) return { label: "Client request", tone: "info", icon: "organizer" };
  if (body.startsWith("Uploaded")) return { label: "Document", tone: "info", icon: "uploaded" };
  if (body.startsWith("Unavailable:")) return { label: "Document", tone: "info", icon: "unavailable" };
  if (body.startsWith("Replacement requested")) return { label: "Document", tone: "info", icon: "replacement" };
  if (body.startsWith("Document accepted")) return { label: "Document", tone: "info", icon: "accepted" };
  if (body.startsWith("Waived:")) return { label: "Document", tone: "info", icon: "waived" };
  switch (message.kind) {
    case "note":
      return { label: "Team note", tone: "neutral", icon: "note" };
    case "event":
      return { label: "Update", tone: "info", icon: "update" };
    case "message":
      return { label: "Message", tone: "info", icon: "message" };
    default: {
      const exhaustive: never = message.kind;
      return exhaustive;
    }
  }
}

export type ActivityGroup = "documents" | "preparation" | "reviews" | "signatures" | "filing" | "messages" | "assignments" | "other";

export function activityGroup(label: string): ActivityGroup {
  switch (label) {
    case "Document":
    case "Document review":
    case "Client request":
      return "documents";
    case "Preparation":
      return "preparation";
    case "Review":
    case "Review approval":
    case "Stage change":
      return "reviews";
    case "Authorization":
      return "signatures";
    case "Filing status":
    case "Delivery":
      return "filing";
    case "Message":
      return "messages";
    case "Assignment":
      return "assignments";
    case "Team note":
    case "Update":
      return "other";
    default:
      return "other";
  }
}

export function trackStatusLabel(visual: TrackVisual): string {
  switch (visual) {
    case "complete":
      return "Complete";
    case "active":
      return "Current";
    case "pending":
      return "Not started";
    case "blocked":
      return "Blocked";
    default: {
      const exhaustive: never = visual;
      return exhaustive;
    }
  }
}
