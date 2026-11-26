import { StageMoveForm } from "@/components/return-workspace/stage-move-form";
import { Button } from "@/components/ui/button";
import { stages, type Stage } from "@/lib/return-workflow";

export function ReturnBanner({
  stage,
  blocker,
  advanceAction,
  advanceLabel,
  advanceNeedsNote,
  openYearAction,
}: {
  stage: Stage;
  blocker: string | null;
  advanceAction: ((data: FormData) => Promise<void>) | null;
  advanceLabel: string | null;
  advanceNeedsNote: boolean;
  openYearAction: (() => Promise<void>) | null;
}) {
  if (stage === "canceled") {
    return (
      <section className="grid gap-1 rounded-lg border px-3 py-3">
        <p className="text-sm font-medium">Canceled</p>
        <p className="text-sm text-muted-foreground">The client cancelled this return. It stays off the active stages.</p>
      </section>
    );
  }
  if (stage === "lead" || stage === "onboarding") {
    return (
      <section className="grid gap-2 rounded-lg border px-3 py-3">
        <p className="text-sm">
          This file is still in {stages[stage].toLowerCase()}. Client acquisition and onboarding sit outside the return stages.
        </p>
        {advanceAction && advanceLabel ? (
          <StageMoveForm action={advanceAction} needsNote={advanceNeedsNote} label={advanceLabel} />
        ) : (
          <p className="text-sm text-muted-foreground">{blocker ?? "This file cannot move forward yet."}</p>
        )}
      </section>
    );
  }
  if (stage === "renewal") {
    return (
      <section className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-3">
        <p className="text-sm">Delivery is complete. This file is in year-round services.</p>
        {openYearAction ? (
          <form action={openYearAction}>
            <Button type="submit" size="sm">Open next tax year</Button>
          </form>
        ) : null}
      </section>
    );
  }
  return null;
}
