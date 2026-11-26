import Link from "next/link";
import { LinkPendingMark } from "@/components/ui/button";
import { Stepper, StepperDescription, StepperIndicator, StepperItem, StepperLabel, StepperList, StepperTrigger } from "@/components/ui/stepper";
import { readinessLabel, type Readiness, type StageReadiness } from "@/lib/return-readiness";
import { returnTabHref } from "@/lib/return-progress";
import type { Stage } from "@/lib/return-workflow";
import { cn } from "@/lib/utils";

function activeStepId(steps: StageReadiness[], operational: Stage): string | null {
  switch (operational) {
    case "canceled":
    case "lead":
    case "onboarding":
      return null;
    case "renewal":
      return "delivery";
    case "documents": {
      const documents = steps.find((step) => step.id === "documents");
      const letter = steps.find((step) => step.id === "letter");
      if (documents && documents.readiness !== "complete") return "documents";
      return letter?.id ?? "documents";
    }
    case "preparation":
    case "review":
    case "approval":
    case "filing":
    case "delivery":
      return steps.find((step) => step.stage === operational)?.id ?? null;
    default: {
      const exhaustive: never = operational;
      return exhaustive;
    }
  }
}

function isProblem(readiness: Readiness): boolean {
  switch (readiness) {
    case "blocked":
    case "needs_attention":
      return true;
    case "not_started":
    case "in_progress":
    case "complete":
    case "unknown":
      return false;
    default: {
      const exhaustive: never = readiness;
      return exhaustive;
    }
  }
}

export function ReturnProgress({
  steps,
  operational,
  profileId,
  returnId,
}: {
  steps: StageReadiness[];
  operational: Stage;
  profileId: string;
  returnId: string;
}) {
  if (operational === "canceled") {
    return (
      <div className="rounded-lg border px-3 py-3">
        <p className="text-sm font-medium">Canceled</p>
        <p className="text-sm text-muted-foreground">This return is no longer moving through Documents, Preparation, Review, Authorization, Filing, or Delivery.</p>
      </div>
    );
  }

  const currentId = activeStepId(steps, operational);
  const currentIndex = steps.findIndex((step) => step.id === currentId);
  const track = steps.map((step) => ({ value: step.id }));
  const stepperSteps = currentIndex >= 0 ? track : [{ value: "before" }, ...track];
  const stepperValue = currentIndex >= 0 ? steps[currentIndex].id : "before";

  return (
    <Stepper value={stepperValue} steps={stepperSteps} orientation="horizontal" className="gap-0">
      <StepperList aria-label="Return progress" className="pb-0">
        {steps.map((step, index) => {
          const current = index === currentIndex;
          const problem = isProblem(step.readiness);
          const finished = step.readiness === "complete";
          const passed = !problem && currentIndex >= 0 && index < currentIndex;
          return (
            <StepperItem key={step.id} value={step.id} completed={passed} error={problem} defaultTrigger={false}>
              <StepperTrigger asChild>
                <Link href={returnTabHref(profileId, returnId, step.tab)} scroll={false}>
                  <StepperIndicator>{finished || passed ? "✓" : problem ? "!" : index + 1}</StepperIndicator>
                  <span className="grid gap-0.5">
                    <StepperLabel>{step.label}</StepperLabel>
                    <StepperDescription className={cn(problem && "text-destructive")}>{readinessLabel(step.readiness)}</StepperDescription>
                  </span>
                  <LinkPendingMark />
                </Link>
              </StepperTrigger>
            </StepperItem>
          );
        })}
      </StepperList>
    </Stepper>
  );
}
