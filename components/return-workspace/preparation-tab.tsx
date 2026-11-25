import Link from "next/link";
import { DeskChecklist, DeskIssues } from "@/components/return-workspace/desk-panel";
import { StageMoveForm } from "@/components/return-workspace/stage-move-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { recordIntakeReview, saveReturnDesk } from "@/lib/actions";
import type { GateInput } from "@/lib/engagement";
import type { DocumentEntry } from "@/lib/return-documents";
import { advanceOffer, blockerLines, returnTabHref } from "@/lib/return-progress";
import { preparationChecklist } from "@/lib/return-desk";
import { getPreparationReadiness, preparationBlockers, readinessLabel, type Readiness } from "@/lib/return-readiness";
import { stages } from "@/lib/return-workflow";

type Person = { id: string; name: string };

function readinessTone(readiness: Readiness): "success" | "destructive" | "attention" | "progress" | "neutral" {
  switch (readiness) {
    case "complete":
      return "success";
    case "blocked":
      return "destructive";
    case "needs_attention":
    case "unknown":
      return "attention";
    case "in_progress":
      return "progress";
    case "not_started":
      return "neutral";
    default: {
      const exhaustive: never = readiness;
      return exhaustive;
    }
  }
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <li className="grid gap-0.5 border-t py-2 first:border-t-0 first:pt-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </li>
  );
}

export function PreparationTab({
  profileId,
  returnId,
  gate,
  preparer,
  files,
  teammates,
  advanceAction,
}: {
  profileId: string;
  returnId: string;
  gate: GateInput;
  preparer: string;
  files: DocumentEntry[];
  teammates: Person[];
  advanceAction: (data: FormData) => Promise<void>;
}) {
  const { workflow } = gate;
  const note = recordIntakeReview.bind(null, profileId, returnId);
  const software = saveReturnDesk.bind(null, profileId, returnId, workflow.revision);
  const readiness = getPreparationReadiness(gate);
  const blockers = workflow.stage === "preparation" ? preparationBlockers(gate) : [];
  const offer = workflow.stage === "preparation" ? advanceOffer(gate) : null;
  const workpapers = files.filter((file) => file.group === "workpaper" && file.downloadHref);
  const checklist = preparationChecklist(gate.workflow.taxpayerType);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="grid content-start gap-3">
        <section className="grid gap-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Preparation checklist</h2>
            <Badge variant={readinessTone(readiness.readiness)}>{readinessLabel(readiness.readiness)}</Badge>
          </div>
          <ul className="grid">
            <Fact label="Status" value={readiness.detail} />
            <Fact label="Preparer" value={preparer} />
          </ul>
          <DeskChecklist
            profileId={profileId}
            returnId={returnId}
            revision={workflow.revision}
            area="preparation"
            items={checklist}
            saved={workflow.desk.preparationChecks}
          />
        </section>
        <section className="grid gap-3 rounded-lg border p-3">
          <div>
            <h2 className="text-sm font-medium">Tax software</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Saved for the firm. This does not file the return.</p>
          </div>
          <ul className="grid">
            <Fact label="Tax year" value={String(workflow.taxYear)} />
            <Fact label="Version" value={String(workflow.returnVersion)} />
          </ul>
          <form action={software} className="grid gap-3">
            <input type="hidden" name="intent" value="software" />
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-muted-foreground">Software</span>
                <Input name="softwareName" maxLength={80} defaultValue={workflow.desk.softwareName} placeholder="Drake, TaxSlayer…" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-muted-foreground">Return reference</span>
                <Input name="softwareReference" maxLength={80} defaultValue={workflow.desk.softwareReference} placeholder="Internal reference" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-muted-foreground">Internal status</span>
                <Input name="softwareStatus" maxLength={80} defaultValue={workflow.desk.softwareStatus} placeholder="In progress" />
              </label>
            </div>
            <Button type="submit" size="sm" className="w-fit">Save reference</Button>
          </form>
        </section>
        <section className="grid gap-2 rounded-lg border p-3">
          <h2 className="text-sm font-medium">Preparation issues</h2>
          <DeskIssues
            profileId={profileId}
            returnId={returnId}
            revision={workflow.revision}
            area="preparation"
            issues={workflow.desk.issues}
            teammates={teammates}
          />
        </section>
        <section className="grid gap-3 rounded-lg border p-3">
          <div>
            <h2 className="text-sm font-medium">Workpapers</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Supporting files. Source documents stay on the Documents tab.</p>
          </div>
          {workpapers.length === 0 ? <p className="text-sm text-muted-foreground">No workpapers yet.</p> : (
            <ul className="grid">
              {workpapers.map((file) => (
                <li key={file.id} className="flex items-center justify-between gap-3 border-t py-2 first:border-t-0 first:pt-0">
                  <span className="min-w-0 truncate text-sm">{file.label}</span>
                  <Button nativeButton={false} variant="outline" size="sm" className="shrink-0" render={<a href={file.downloadHref ?? "#"} />}>Download</Button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <form action={note} className="grid gap-3 rounded-lg border p-3">
          <div>
            <h2 className="text-sm font-medium">Note for the team</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Only the firm can see this.</p>
          </div>
          <label htmlFor="prep-note" className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">Note</span>
            <Textarea id="prep-note" name="detail" required maxLength={1000} placeholder="What should the next preparer know?" rows={2} />
          </label>
          <Button className="w-fit" type="submit" name="action" value="note" size="sm">Save note</Button>
        </form>
      </div>
      <aside className="grid content-start gap-3 rounded-lg border p-3">
        <h2 className="text-sm font-medium">Submit for review</h2>
        {blockers.length > 0 ? (
          <ul className="grid gap-1 text-sm text-muted-foreground">
            {blockers.map((line) => <li key={line}>{line}</li>)}
          </ul>
        ) : null}
        {workflow.stage === "preparation" && offer && blockers.length === 0 ? (
          <StageMoveForm action={advanceAction} needsNote={offer.needsNote} label="Submit for review" />
        ) : null}
        {workflow.stage === "preparation" && !offer ? (
          <p className="text-sm text-muted-foreground">{blockerLines(gate)[0] ?? "This return cannot move to review yet."}</p>
        ) : null}
        {workflow.stage !== "preparation" ? (
          <div className="grid gap-2">
            <p className="text-sm text-muted-foreground">This return is in {stages[workflow.stage].toLowerCase()}.</p>
            <Button nativeButton={false} variant="outline" size="sm" className="w-fit" render={<Link href={returnTabHref(profileId, returnId, "overview")} />}>
              Back to overview
            </Button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
