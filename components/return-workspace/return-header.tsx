import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ReturnActions } from "@/components/return-workspace/return-actions";
import { shortDate } from "@/lib/return-progress";
import { readinessLabel, type Readiness } from "@/lib/return-readiness";
import { stages, type Stage, type WaitingOn } from "@/lib/return-workflow";
import { stageTone } from "@/lib/status-tone";
import type { Invoice, LeadSource, ServiceLine } from "@/lib/types";

type Person = { id: string; name: string };
type FormAction = (data: FormData) => Promise<void>;

function initials(name: string) {
  const letters = name
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "?";
}

function waitingLabel(waiting: Exclude<WaitingOn, null>): string {
  switch (waiting) {
    case "staff":
      return "On you";
    case "client":
      return "On the client";
    default: {
      const exhaustive: never = waiting;
      return exhaustive;
    }
  }
}

export function ReturnHeader({
  clientName,
  avatar = null,
  yearLabel,
  email,
  preparer,
  reviewer,
  due,
  stage,
  waitingOn,
  assignAction,
  advanceAction,
  advanceLabel,
  advanceNeedsNote,
  sendBackAction,
  sendBackLabel,
  openYearAction,
  contactHref,
  teammates,
  ownerId,
  nextAction,
  readiness,
  profileId,
  returnId,
  revision,
  source,
  services,
  invoice,
}: {
  clientName: string;
  avatar?: string | null;
  yearLabel: string;
  email: string;
  preparer: string;
  reviewer: string;
  due: string | null;
  stage: Stage;
  waitingOn: WaitingOn;
  assignAction: FormAction;
  advanceAction: FormAction | null;
  advanceLabel: string | null;
  advanceNeedsNote: boolean;
  sendBackAction: FormAction | null;
  sendBackLabel: string | null;
  openYearAction: FormAction | null;
  contactHref: string;
  teammates: Person[];
  ownerId: string;
  nextAction: string;
  readiness: Readiness;
  profileId: string;
  returnId: string;
  revision: number;
  source: LeadSource;
  services: ServiceLine[];
  invoice: Invoice | null;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <Avatar size="lg">
          {avatar ? <AvatarImage src={avatar} alt="" /> : null}
          <AvatarFallback>{initials(clientName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">{clientName}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {yearLabel}
            {email ? ` · ${email}` : ""}
          </p>
          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Preparer</dt>
              <dd>{preparer}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Reviewer</dt>
              <dd>{reviewer}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Due</dt>
              <dd>{due ? shortDate(due) : "No due date"}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={stageTone(stage)}>{stages[stage]}</Badge>
        <Badge variant={readiness === "complete" ? "success" : readiness === "blocked" ? "destructive" : readiness === "needs_attention" || readiness === "unknown" ? "attention" : "neutral"}>{readinessLabel(readiness)}</Badge>
        {waitingOn ? <Badge variant={waitingOn === "staff" ? "attention" : "warning"}>{waitingLabel(waitingOn)}</Badge> : null}
        <ReturnActions
          assignAction={assignAction}
          advanceAction={advanceAction}
          advanceLabel={advanceLabel}
          advanceNeedsNote={advanceNeedsNote}
          sendBackAction={sendBackAction}
          sendBackLabel={sendBackLabel}
          openYearAction={openYearAction}
          contactHref={contactHref}
          teammates={teammates}
          owner={ownerId}
          due={due ?? ""}
          nextAction={nextAction}
          profileId={profileId}
          returnId={returnId}
          revision={revision}
          source={source}
          services={services}
          invoice={invoice}
        />
      </div>
    </header>
  );
}
