import type { TaxReturn } from "@/lib/types";

export const stages = {
  intake: "Intake review",
  waiting: "Waiting on client",
  preparation: "In preparation",
  review: "Preparer review",
  followup: "Filing follow-up",
  closed: "Closed",
};

export type Stage = keyof typeof stages;

export type Workflow = {
  stage: Stage;
  owner: string | null;
  due: string | null;
  nextAction: string;
  resumeStage: Stage | null;
  revision: number;
};

export type TeamReturn = TaxReturn & Workflow;

export const initialWorkflow: Workflow = {
  stage: "intake", owner: null, due: null, nextAction: "", resumeStage: null, revision: 0,
};
