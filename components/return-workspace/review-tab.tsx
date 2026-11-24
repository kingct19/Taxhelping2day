import { EngagementPacket } from "@/components/engagement-packet";
import { EfilePanel } from "@/components/efile-panel";
import { DeskChecklist, DeskIssues } from "@/components/return-workspace/desk-panel";
import { StageMoveForm } from "@/components/return-workspace/stage-move-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveReturnDesk } from "@/lib/actions";
import type { GateInput } from "@/lib/engagement";
import { reviewChecklist } from "@/lib/return-desk";
import { advanceOffer, returnFieldClass, sendBackOffer, shortDateTime } from "@/lib/return-progress";
import { getAuthorizationReadiness, getReviewReadiness, readinessLabel, reviewBlockers, type Readiness } from "@/lib/return-readiness";
import { stages } from "@/lib/return-workflow";
import type { EfileAuthorization, Message } from "@/lib/types";

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

export function ReviewTab({
  profileId,
  returnId,
  email,
  gate,
  reviewer,
  teammates,
  authorizations,
  messages,
  advanceAction,
  sendBackAction,
}: {
  profileId: string;
  returnId: string;
  email: string;
  gate: GateInput;
  reviewer: string;
  teammates: Person[];
  authorizations: EfileAuthorization[];
  messages: Message[];
  advanceAction: (data: FormData) => Promise<void>;
  sendBackAction: (data: FormData) => Promise<void>;
}) {
  const { workflow } = gate;
  const review = getReviewReadiness(gate);
  const authorization = getAuthorizationReadiness(gate);
  const blockers = workflow.stage === "review" ? reviewBlockers(gate) : [];
  const offer = workflow.stage === "review" || workflow.stage === "approval" ? advanceOffer(gate) : null;
  const back = workflow.stage === "review" || workflow.stage === "approval" || workflow.stage === "filing" ? sendBackOffer(gate) : null;
  const desk = saveReturnDesk.bind(null, profileId, returnId, workflow.revision);
  const decisions = messages.filter((message) => message.kind === "note" && (message.body.startsWith("Review") || message.body.includes("Form 8879") || message.body.includes("Return version")));

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid content-start gap-3">
        <section className="grid gap-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Reviewer</h2>
            <Badge variant={readinessTone(review.readiness)}>{readinessLabel(review.readiness)}</Badge>
          </div>
          <ul className="grid">
            <Fact label="Assigned" value={reviewer} />
            <Fact label="Status" value={review.detail} />
          </ul>
          <form action={desk} className="grid gap-3">
            <input type="hidden" name="intent" value="reviewer" />
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Assign reviewer</span>
              <select className={returnFieldClass} name="reviewer" defaultValue={workflow.reviewerId ?? ""}>
                <option value="">Unassigned</option>
                {teammates.map((person) => (
                  <option key={person.id} value={person.id}>{person.name}</option>
                ))}
              </select>
            </label>
            <Button type="submit" size="sm" className="w-fit">Save reviewer</Button>
          </form>
        </section>
        <section className="grid gap-3 rounded-lg border p-3">
          <div>
            <h2 className="text-sm font-medium">Review checklist</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Approval applies to version {workflow.returnVersion}. A later version needs its own approval.</p>
          </div>
          <DeskChecklist
            profileId={profileId}
            returnId={returnId}
            revision={workflow.revision}
            area="review"
            items={reviewChecklist(gate.profile.taxpayerType)}
            saved={workflow.desk.reviewChecks}
          />
        </section>
        <section className="grid gap-2 rounded-lg border p-3">
          <h2 className="text-sm font-medium">Corrections</h2>
          <DeskIssues
            profileId={profileId}
            returnId={returnId}
            revision={workflow.revision}
            area="review"
            issues={workflow.desk.issues}
            teammates={teammates}
          />
        </section>
        <section className="grid gap-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Decisions</h2>
            <Badge variant="neutral">{stages[workflow.stage]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Reviewer approval is separate from Form 8879.</p>
          {blockers.length > 0 ? (
            <ul className="grid">
              {blockers.map((line) => <Fact key={line} label="Still open" value={line} />)}
            </ul>
          ) : null}
          <div className="grid gap-3 border-t pt-3">
            <h3 className="text-sm font-medium">{workflow.stage === "approval" ? "Move to filing" : "Approve return"}</h3>
            {offer && blockers.length === 0 ? <StageMoveForm action={advanceAction} needsNote={offer.needsNote} label={offer.label} /> : (
              <p className="text-sm text-muted-foreground">Finish the open review items. Approval stays on version {workflow.returnVersion}.</p>
            )}
          </div>
          <div className="grid gap-3 border-t pt-3">
            <h3 className="text-sm font-medium">Return to preparer</h3>
            {back ? (
              <form action={sendBackAction} className="grid gap-3">
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-muted-foreground">What has to change</span>
                  <Input name="reason" required maxLength={500} placeholder="What has to change?" />
                </label>
                <Button type="submit" size="sm" className="w-fit">{back.label}</Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Send the return back from review, or from filing after a rejection is recorded.</p>
            )}
            {workflow.desk.reviewedVersion != null || workflow.reviewedAt ? (
              <form action={desk}>
                <input type="hidden" name="intent" value="reopen-review" />
                <Button type="submit" variant="outline" size="sm">Reopen review</Button>
              </form>
            ) : null}
          </div>
        </section>
        <section className="grid gap-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Form 8879</h2>
            <Badge variant={readinessTone(authorization.readiness)}>{readinessLabel(authorization.readiness)}</Badge>
          </div>
          <ul className="grid">
            <Fact label="This version" value={authorization.detail} />
          </ul>
          {decisions.length === 0 ? <p className="text-sm text-muted-foreground">No review decisions recorded yet.</p> : (
            <ul className="grid">
              {decisions.slice(-6).map((entry) => (
                <li key={entry.id} className="grid gap-0.5 border-t py-2 first:border-t-0 first:pt-0">
                  <span className="text-xs text-muted-foreground">{shortDateTime(entry.createdAt)}</span>
                  <span className="text-sm">{entry.body}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <div className="grid content-start gap-3">
        <EfilePanel mode="staff" profileId={profileId} returnId={returnId} returnVersion={workflow.returnVersion} authorizations={authorizations} />
        <EngagementPacket profileId={profileId} returnId={returnId} email={email} />
      </div>
    </div>
  );
}
