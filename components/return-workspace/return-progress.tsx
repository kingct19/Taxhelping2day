import Link from "next/link";
import { CheckIcon } from "lucide-react";
import { LinkPendingMark } from "@/components/ui/button";
import { readinessLabel, type Readiness, type StageReadiness } from "@/lib/return-readiness";
import { returnTabHref } from "@/lib/return-progress";
import type { Stage } from "@/lib/return-workflow";
import { cn } from "@/lib/utils";

function markClass(readiness: Readiness, current: boolean): string {
  switch (readiness) {
    case "complete":
      return "bg-foreground text-background";
    case "in_progress":
      return "bg-foreground/10 text-foreground ring-1 ring-foreground/30";
    case "blocked":
      return "bg-destructive/10 text-destructive ring-1 ring-destructive/40";
    case "needs_attention":
    case "unknown":
      return "bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/40 dark:text-amber-200";
    case "not_started":
      return current ? "bg-foreground/10 text-foreground ring-1 ring-foreground/30" : "bg-muted text-muted-foreground";
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
  return (
    <ol aria-label="Return progress" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {steps.map((step, index) => {
        const current = step.stage === operational || (operational === "renewal" && step.stage === "delivery");
        return (
          <li key={step.id}>
            <Link
              href={returnTabHref(profileId, returnId, step.tab)}
              scroll={false}
              aria-current={current ? "step" : undefined}
              className="flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 hover:bg-muted has-data-[pending]:bg-muted"
            >
              <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium", markClass(step.readiness, current))}>
                {step.readiness === "complete" ? <CheckIcon className="size-3" aria-hidden="true" /> : index + 1}
              </span>
              <span className="min-w-0">
                <span className={cn("block truncate text-sm", current && "font-medium")}>{step.label}</span>
                <span className={cn("block truncate text-xs", step.readiness === "blocked" ? "text-destructive" : "text-muted-foreground")}>
                  {readinessLabel(step.readiness)}
                </span>
              </span>
              <LinkPendingMark />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
