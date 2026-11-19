import type { Stage } from "@/lib/return-workflow";
import type { FilingStatus, RequestState } from "@/lib/types";

export type StatusTone = "info" | "progress" | "warning" | "attention" | "accent" | "success" | "neutral" | "destructive";

export function stageTone(stage: Stage): StatusTone {
  switch (stage) {
    case "intake":
      return "info";
    case "waiting":
      return "warning";
    case "preparation":
      return "progress";
    case "review":
      return "attention";
    case "followup":
      return "accent";
    case "closed":
      return "neutral";
    default: {
      const exhaustive: never = stage;
      return exhaustive;
    }
  }
}

export function requestTone(state: RequestState): StatusTone {
  switch (state) {
    case "open":
    case "replacement":
    case "unavailable":
      return "warning";
    case "responded":
      return "attention";
    case "accepted":
      return "success";
    case "waived":
      return "neutral";
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

export function filingTone(status: FilingStatus): StatusTone {
  switch (status) {
    case "draft":
      return "info";
    case "changes":
      return "warning";
    case "signature":
      return "progress";
    case "transmitted":
      return "accent";
    case "accepted":
      return "success";
    case "rejected":
      return "destructive";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}
