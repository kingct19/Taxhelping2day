import { isOrganizerItem, missingOrganizer, requestsFor, type GateInput } from "@/lib/engagement";
import { filingPlace } from "@/lib/next-action";
import { clientOwes, staffOwes } from "@/lib/request-thread";
import { missingRequiredChecks, preparationChecklist, recordedCheckCount, reviewChecklist, type DeskIssue } from "@/lib/return-desk";
import { returnTabHref, type ReturnTab } from "@/lib/return-progress";
import { stageOrder, type Stage } from "@/lib/return-workflow";
import type { FilingStatus } from "@/lib/types";

export type Readiness = "not_started" | "in_progress" | "complete" | "blocked" | "needs_attention" | "unknown";

export type StageReadiness = {
  id: "documents" | "preparation" | "review" | "approval" | "filing" | "delivery";
  label: string;
  stage: Stage;
  tab: ReturnTab;
  readiness: Readiness;
  detail: string;
};

export type WorkAction = {
  id: string;
  title: string;
  description: string;
  priority: "high" | "normal" | "low";
  who: string;
  blocking: boolean;
  href: string;
  due: string | null;
};

export type WorkflowState = {
  stages: StageReadiness[];
  overall: Readiness;
  actions: WorkAction[];
  summary: { label: string; value: string }[];
};

const rank: Record<Readiness, number> = {
  blocked: 0,
  needs_attention: 1,
  unknown: 2,
  in_progress: 3,
  not_started: 4,
  complete: 5,
};

export function readinessLabel(readiness: Readiness): string {
  switch (readiness) {
    case "not_started":
      return "Not started";
    case "in_progress":
      return "In progress";
    case "complete":
      return "Complete";
    case "blocked":
      return "Blocked";
    case "needs_attention":
      return "Needs attention";
    case "unknown":
      return "Needs verification";
    default: {
      const exhaustive: never = readiness;
      return exhaustive;
    }
  }
}

export function filingDeskLabel(status: FilingStatus): string {
  switch (status) {
    case "draft":
      return "Not ready";
    case "signature":
      return "Ready to transmit";
    case "transmitted":
      return "Awaiting acknowledgement";
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    case "changes":
      return "Ready to resubmit";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function atLeast(stage: Stage, target: Stage): boolean {
  return stageOrder.indexOf(stage) >= stageOrder.indexOf(target);
}

function after(stage: Stage, target: Stage): boolean {
  return stageOrder.indexOf(stage) > stageOrder.indexOf(target);
}

function before(stage: Stage, target: Stage): boolean {
  return stageOrder.indexOf(stage) < stageOrder.indexOf(target);
}

function worst(values: Readiness[]): Readiness {
  return values.reduce((left, right) => (rank[left] <= rank[right] ? left : right));
}

function openIssues(issues: DeskIssue[], area: DeskIssue["area"], blockingOnly: boolean): DeskIssue[] {
  return issues.filter((issue) => issue.area === area && issue.status === "open" && (!blockingOnly || issue.blocking));
}

export function getDocumentReadiness(input: GateInput): { readiness: Readiness; detail: string } {
  const { workflow, threads } = input;
  const filingTypeId = workflow.filingTypeId || workflow.taxpayerType;
  const requiredTitles = new Set(requestsFor(filingTypeId, workflow.desk, input.catalog).filter((item) => item.required).map((item) => item.title));
  const gaps = missingOrganizer(filingTypeId, threads, workflow.desk, input.catalog);
  const relevant = threads.filter((thread) => {
    const state = thread.latest.requestState;
    if (!state) return false;
    if (thread.root.requestBlock === "start" || thread.root.requestBlock === "filing") return true;
    return [...requiredTitles].some((title) => isOrganizerItem(thread.root.body, title));
  });
  const unfinished = relevant.filter((thread) => {
    const state = thread.latest.requestState;
    return state !== "accepted" && state !== "waived";
  });
  const awaitingReview = unfinished.filter((thread) => thread.latest.requestState && staffOwes(thread.latest.requestState));
  if (awaitingReview.length > 0) {
    return { readiness: "needs_attention", detail: `${awaitingReview.length} uploaded ${awaitingReview.length === 1 ? "item needs" : "items need"} review` };
  }
  if (unfinished.length > 0) {
    const readiness = before(workflow.stage, "documents") ? "not_started" : "blocked";
    return { readiness, detail: `${unfinished.length} required ${unfinished.length === 1 ? "request is" : "requests are"} still open` };
  }
  if (gaps.length > 0) {
    if (before(workflow.stage, "documents")) return { readiness: "not_started", detail: "Document collection has not started" };
    if (workflow.stage === "documents" || relevant.length > 0) {
      return { readiness: "blocked", detail: `${gaps.length} required ${gaps.length === 1 ? "request has" : "requests have"} not been sent` };
    }
    return { readiness: "unknown", detail: "No document checklist was recorded for this return" };
  }
  if (relevant.length > 0) return { readiness: "complete", detail: "Required documents are accepted or waived" };
  if (before(workflow.stage, "documents")) return { readiness: "not_started", detail: "Document collection has not started" };
  if (workflow.stage === "documents") return { readiness: "in_progress", detail: "No required requests have been recorded yet" };
  return { readiness: "unknown", detail: "No document checklist was recorded for this return" };
}

export function getPreparationReadiness(input: GateInput): { readiness: Readiness; detail: string } {
  const { workflow } = input;
  const desk = workflow.desk;
  const checklist = preparationChecklist(input.workflow.taxpayerType);
  const missing = missingRequiredChecks(checklist, desk.preparationChecks);
  const blocking = openIssues(desk.issues, "preparation", true);
  if (blocking.length > 0) return { readiness: "blocked", detail: `${blocking.length} blocking preparation ${blocking.length === 1 ? "issue" : "issues"}` };
  if (desk.preparedVersion != null && desk.preparedVersion !== workflow.returnVersion) {
    return { readiness: "needs_attention", detail: `Preparation was recorded on version ${desk.preparedVersion}` };
  }
  if (missing.length === 0 && recordedCheckCount(desk.preparationChecks) > 0 && desk.preparedVersion === workflow.returnVersion) {
    return { readiness: "complete", detail: `Submitted on version ${workflow.returnVersion}` };
  }
  if (recordedCheckCount(desk.preparationChecks) === 0 && desk.preparedVersion == null) {
    if (before(workflow.stage, "preparation")) return { readiness: "not_started", detail: "Preparation has not started" };
    if (after(workflow.stage, "preparation")) return { readiness: "unknown", detail: "No preparation checklist was recorded" };
    return { readiness: "in_progress", detail: "Required preparation items are still open" };
  }
  if (after(workflow.stage, "preparation") && desk.preparedVersion == null) {
    return { readiness: "needs_attention", detail: missing[0] ? `Still open: ${missing[0]}` : "Preparation was not recorded on this version" };
  }
  return { readiness: "in_progress", detail: missing[0] ? `Still open: ${missing[0]}` : "Ready to submit for review" };
}

export function getReviewReadiness(input: GateInput): { readiness: Readiness; detail: string } {
  const { workflow } = input;
  const desk = workflow.desk;
  const checklist = reviewChecklist(input.workflow.taxpayerType);
  const missing = missingRequiredChecks(checklist, desk.reviewChecks);
  const blocking = openIssues(desk.issues, "review", true);
  if (blocking.length > 0) return { readiness: "blocked", detail: `${blocking.length} open review ${blocking.length === 1 ? "correction" : "corrections"}` };
  if (!workflow.reviewerId && atLeast(workflow.stage, "review")) {
    return { readiness: "needs_attention", detail: "No reviewer is assigned" };
  }
  if (desk.reviewedVersion != null && desk.reviewedVersion !== workflow.returnVersion) {
    return { readiness: "needs_attention", detail: `Review covered version ${desk.reviewedVersion}` };
  }
  const approved = Boolean(workflow.reviewedAt && workflow.reviewerId && desk.reviewedVersion === workflow.returnVersion && missing.length === 0 && recordedCheckCount(desk.reviewChecks) > 0);
  if (approved) return { readiness: "complete", detail: `Approved on version ${workflow.returnVersion}` };
  if (recordedCheckCount(desk.reviewChecks) === 0 && !workflow.reviewedAt && before(workflow.stage, "review")) {
    return { readiness: "not_started", detail: "Review has not started" };
  }
  if (recordedCheckCount(desk.reviewChecks) === 0 && workflow.reviewedAt && desk.reviewedVersion == null) {
    return { readiness: "unknown", detail: "A review date is saved, without a checklist for this version" };
  }
  if (atLeast(workflow.stage, "review") && missing.length > 0) {
    return { readiness: "in_progress", detail: missing[0] ? `Still open: ${missing[0]}` : "Review is in progress" };
  }
  if (before(workflow.stage, "review")) {
    if (workflow.reviewedAt || recordedCheckCount(desk.reviewChecks) > 0 || desk.reviewedVersion != null) {
      return { readiness: "needs_attention", detail: "Review must be repeated before this version can be approved" };
    }
    return { readiness: "not_started", detail: "Review has not started" };
  }
  return { readiness: "needs_attention", detail: "Review is not recorded for this version" };
}

export function getAuthorizationReadiness(input: GateInput): { readiness: Readiness; detail: string } {
  const version = input.workflow.returnVersion;
  const current = input.authorizations.filter((item) => item.returnVersion === version);
  const olderSigned = input.authorizations.some((item) => item.returnVersion < version && item.status === "signed");
  const needed = current.filter((item) => item.status === "needed");
  const signed = current.filter((item) => item.status === "signed");
  if (current.length === 0) {
    if (olderSigned) return { readiness: "needs_attention", detail: `Form 8879 is not signed for version ${version}` };
    if (atLeast(input.workflow.stage, "approval")) return { readiness: "needs_attention", detail: "Form 8879 has not been requested for this version" };
    return { readiness: "not_started", detail: "Authorization has not started" };
  }
  if (needed.length > 0) {
    const readiness = atLeast(input.workflow.stage, "approval") ? "blocked" : "in_progress";
    return { readiness, detail: `${needed.length} signature ${needed.length === 1 ? "is" : "are"} still needed on version ${version}` };
  }
  if (signed.length > 0) return { readiness: "complete", detail: `Signed for version ${version}` };
  return { readiness: "unknown", detail: "Authorization records could not be read" };
}

export function getFilingReadiness(input: GateInput): { readiness: Readiness; detail: string } {
  const rows = input.filings;
  const auth = getAuthorizationReadiness(input);
  if (rows.length === 0) {
    if (atLeast(input.workflow.stage, "filing") && auth.readiness !== "complete") {
      return { readiness: "blocked", detail: "Filing is waiting on authorization" };
    }
    if (after(input.workflow.stage, "filing")) return { readiness: "unknown", detail: "No filing acknowledgement was recorded" };
    if (input.workflow.stage === "filing") return { readiness: "in_progress", detail: "No jurisdiction has been recorded" };
    return { readiness: "not_started", detail: "Filing has not started" };
  }
  if (rows.some((item) => item.status === "rejected")) {
    const rejected = rows.filter((item) => item.status === "rejected");
    return { readiness: "needs_attention", detail: `${rejected.map((item) => filingPlace(item)).join(", ")} rejected` };
  }
  if (rows.every((item) => item.status === "accepted")) {
    if (auth.readiness !== "complete") return { readiness: "needs_attention", detail: "Accepted filings are recorded, and Form 8879 for this version is incomplete" };
    return { readiness: "complete", detail: "Every recorded jurisdiction is accepted" };
  }
  return { readiness: "in_progress", detail: "One or more jurisdictions are still open" };
}

export function getDeliveryReadiness(input: GateInput): { readiness: Readiness; detail: string } {
  const accepted = input.filings.some((item) => item.status === "accepted");
  const rejected = input.filings.some((item) => item.status === "rejected");
  const invoiceReady = Boolean(input.invoice && (input.invoice.status === "waived" || input.invoice.instructions.trim()));
  if (input.workflow.deliveredAt && accepted && !rejected && invoiceReady) {
    return { readiness: "complete", detail: "Delivered, with an accepted acknowledgement" };
  }
  if (input.workflow.deliveredAt && (!accepted || rejected)) {
    return { readiness: "needs_attention", detail: "Delivery was recorded without a clean accepted acknowledgement" };
  }
  if (atLeast(input.workflow.stage, "delivery") && !accepted) return { readiness: "blocked", detail: "An accepted acknowledgement is required before delivery" };
  if (atLeast(input.workflow.stage, "delivery") && !invoiceReady) return { readiness: "blocked", detail: "Payment instructions are required before delivery" };
  if (input.workflow.deliveredAt) return { readiness: "needs_attention", detail: "Closeout items are still open" };
  return { readiness: "not_started", detail: "Delivery has not started" };
}

function communication(input: GateInput): string {
  const staff = input.threads.filter((thread) => thread.latest.requestState && staffOwes(thread.latest.requestState)).length;
  const client = input.threads.filter((thread) => thread.latest.requestState && clientOwes(thread.latest.requestState)).length;
  if (staff === 0 && client === 0) return "Nothing waiting";
  const parts = [];
  if (staff) parts.push(`${staff} for the firm`);
  if (client) parts.push(`${client} for the client`);
  return parts.join(", ");
}

export function getReturnWorkflowState(input: GateInput): WorkflowState {
  const documents = getDocumentReadiness(input);
  const preparation = getPreparationReadiness(input);
  const review = getReviewReadiness(input);
  const authorization = getAuthorizationReadiness(input);
  const filing = getFilingReadiness(input);
  const delivery = getDeliveryReadiness(input);
  const stages: StageReadiness[] = [
    { id: "documents", label: "Documents", stage: "documents", tab: "documents", ...documents },
    { id: "preparation", label: "Preparation", stage: "preparation", tab: "preparation", ...preparation },
    { id: "review", label: "Internal Review", stage: "review", tab: "review", ...review },
    { id: "approval", label: "Client Authorization", stage: "approval", tab: "review", ...authorization },
    { id: "filing", label: "Filing", stage: "filing", tab: "filing", ...filing },
    { id: "delivery", label: "Delivery", stage: "delivery", tab: "filing", ...delivery },
  ];
  const operational = input.workflow.stage === "renewal" ? "delivery" : input.workflow.stage;
  const cursor = stageOrder.indexOf(operational);
  const relevant = stages.filter((stage) => stageOrder.indexOf(stage.stage) <= cursor || stage.readiness !== "not_started");
  const overall = relevant.length === 0 ? "not_started" : worst(relevant.map((stage) => stage.readiness));
  const link = (tab: ReturnTab) => returnTabHref(input.profile.id, input.workflow.id, tab);
  const actions = workActions(input, stages, link);
  const openPrep = openIssues(input.workflow.desk.issues, "preparation", false);
  return {
    stages,
    overall,
    actions,
    summary: [
      { label: "Documents", value: documents.detail },
      { label: "Preparation", value: openPrep.length ? `${openPrep.length} open ${openPrep.length === 1 ? "issue" : "issues"}` : preparation.detail },
      { label: "Review", value: review.detail },
      { label: "Authorization", value: authorization.detail },
      { label: "Filing", value: filing.detail },
      { label: "Messages", value: communication(input) },
    ],
  };
}

function workActions(input: GateInput, stages: StageReadiness[], href: (tab: ReturnTab) => string): WorkAction[] {
  const actions: WorkAction[] = [];
  const due = input.workflow.due;
  const preparer = input.workflow.owner ? "Preparer" : "Unassigned";
  for (const thread of input.threads) {
    const state = thread.latest.requestState;
    if (!state || !staffOwes(state)) continue;
    actions.push({
      id: `doc:${thread.root.id}`,
      title: "Review a client response",
      description: thread.root.body,
      priority: "high",
      who: "Preparer",
      blocking: thread.root.requestBlock === "start" || thread.root.requestBlock === "filing",
      href: href("documents"),
      due,
    });
  }
  const documentStage = stages.find((stage) => stage.id === "documents");
  if (documentStage && (documentStage.readiness === "blocked" || documentStage.readiness === "needs_attention") && !actions.some((item) => item.id.startsWith("doc:"))) {
    actions.push({
      id: "documents",
      title: "Finish required documents",
      description: documentStage.detail,
      priority: "high",
      who: "Preparer",
      blocking: documentStage.readiness === "blocked",
      href: href("documents"),
      due,
    });
  }
  for (const issue of input.workflow.desk.issues) {
    if (issue.status !== "open") continue;
    actions.push({
      id: `issue:${issue.id}`,
      title: issue.title,
      description: issue.detail || (issue.area === "review" ? "Review correction" : "Preparation issue"),
      priority: issue.priority === "low" ? "low" : issue.priority === "high" ? "high" : "normal",
      who: issue.assigneeId ? "Assigned" : issue.area === "review" ? "Reviewer" : preparer,
      blocking: issue.blocking,
      href: href(issue.area === "review" ? "review" : "preparation"),
      due,
    });
  }
  const review = stages.find((stage) => stage.id === "review");
  if (review?.readiness === "needs_attention" && !input.workflow.reviewerId) {
    actions.push({
      id: "reviewer",
      title: "Assign a reviewer",
      description: review.detail,
      priority: "high",
      who: "Firm",
      blocking: false,
      href: href("review"),
      due,
    });
  }
  const authorization = stages.find((stage) => stage.id === "approval");
  if (authorization && (authorization.readiness === "blocked" || authorization.readiness === "needs_attention")) {
    actions.push({
      id: "authorization",
      title: "Obtain Form 8879",
      description: authorization.detail,
      priority: "high",
      who: "Preparer",
      blocking: authorization.readiness === "blocked",
      href: href("review"),
      due,
    });
  }
  for (const filing of input.filings) {
    if (filing.status === "rejected") {
      const title = `Correct the rejected ${filingPlace(filing)} return`;
      if (actions.some((action) => action.title === title)) continue;
      actions.push({
        id: `filing:${filing.id}`,
        title,
        description: filing.note || "Record the correction, then update this filing.",
        priority: "high",
        who: preparer,
        blocking: true,
        href: href("filing"),
        due,
      });
    } else if (filing.status === "transmitted") {
      actions.push({
        id: `filing:${filing.id}`,
        title: `Record the ${filingPlace(filing)} acknowledgement`,
        description: "The firm records this after tax software moves. It is not an IRS receipt.",
        priority: "normal",
        who: preparer,
        blocking: false,
        href: href("filing"),
        due,
      });
    }
  }
  const seen = new Set<string>();
  return actions.filter((action) => {
    if (seen.has(action.id)) return false;
    seen.add(action.id);
    return true;
  });
}

export function preparationBlockers(input: GateInput): string[] {
  const lines: string[] = [];
  if (!input.workflow.returnVersion) lines.push("This return has no version.");
  if (!input.workflow.owner) lines.push("Assign a preparer.");
  for (const label of missingRequiredChecks(preparationChecklist(input.workflow.taxpayerType), input.workflow.desk.preparationChecks)) {
    lines.push(`Check off ${label}.`);
  }
  for (const issue of openIssues(input.workflow.desk.issues, "preparation", true)) lines.push(`Resolve ${issue.title}.`);
  return lines;
}

export function reviewBlockers(input: GateInput): string[] {
  const lines: string[] = [];
  if (!input.workflow.reviewerId) lines.push("Assign a reviewer.");
  for (const label of missingRequiredChecks(reviewChecklist(input.workflow.taxpayerType), input.workflow.desk.reviewChecks)) {
    lines.push(`Check off ${label}.`);
  }
  for (const issue of openIssues(input.workflow.desk.issues, "review", true)) lines.push(`Resolve ${issue.title}.`);
  return lines;
}
