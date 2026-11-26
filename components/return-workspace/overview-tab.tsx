import Link from "next/link";
import { EngagementPacket } from "@/components/engagement-packet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { describeActivity, returnTabHref, shortDate, shortDateTime } from "@/lib/return-progress";
import { readinessLabel, type Readiness, type WorkAction, type WorkflowState } from "@/lib/return-readiness";
import type { Message } from "@/lib/types";

function priorityLabel(priority: WorkAction["priority"]): string {
  switch (priority) {
    case "high":
      return "High";
    case "normal":
      return "Normal";
    case "low":
      return "Low";
    default: {
      const exhaustive: never = priority;
      return exhaustive;
    }
  }
}

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

export function OverviewTab({
  profileId,
  returnId,
  email,
  state,
  messages,
  authors,
}: {
  profileId: string;
  returnId: string;
  email: string;
  state: WorkflowState;
  messages: Message[];
  authors: Map<string, string>;
}) {
  const recent = [...messages].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section className="grid content-start gap-2 rounded-lg border p-3 lg:col-span-2">
        <h2 className="text-sm font-medium">Action required</h2>
        {state.actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing is waiting on this return.</p>
        ) : (
          <ul className="grid gap-2">
            {state.actions.map((action) => (
              <li key={action.id} className="flex items-start justify-between gap-3 rounded-lg border px-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{action.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{action.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant={action.priority === "high" ? "warning" : "neutral"}>{priorityLabel(action.priority)}</Badge>
                    <Badge variant={action.blocking ? "destructive" : "neutral"}>{action.blocking ? "Blocking" : "Not blocking"}</Badge>
                    <span className="text-xs text-muted-foreground">{action.who}</span>
                    {action.due ? <span className="text-xs text-muted-foreground">Due {shortDate(action.due)}</span> : null}
                  </div>
                </div>
                <Button nativeButton={false} size="sm" className="shrink-0" render={<Link href={action.href} />}>
                  Open
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="lg:col-span-2">
        <EngagementPacket profileId={profileId} returnId={returnId} email={email} />
      </div>
      <section className="grid content-start gap-3 rounded-lg border p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Status</h2>
          <Badge variant={readinessTone(state.overall)}>{readinessLabel(state.overall)}</Badge>
        </div>
        <ul className="grid">
          {state.summary.map((row) => (
            <li key={row.label} className="grid gap-0.5 border-t py-2 first:border-t-0 first:pt-0">
              <span className="text-xs font-medium text-muted-foreground">{row.label}</span>
              <span className="text-sm">{row.value}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="grid content-start gap-3 rounded-lg border p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Recent activity</h2>
          <Button nativeButton={false} variant="outline" size="sm" render={<Link href={returnTabHref(profileId, returnId, "activity")} />}>
            View all
          </Button>
        </div>
        {recent.length === 0 ? <p className="text-sm text-muted-foreground">Nothing recorded yet.</p> : (
          <ul className="grid">
            {recent.map((entry) => {
              const described = describeActivity(entry);
              return (
                <li key={entry.id} className="grid gap-1 border-t py-2 first:border-t-0 first:pt-0">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="neutral">{described.label}</Badge>
                    <span className="text-xs text-muted-foreground">{shortDateTime(entry.createdAt)}</span>
                  </div>
                  <p className="line-clamp-2 text-sm">{entry.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {authors.get(entry.authorId) || "Team"}
                    {" · "}
                    {entry.kind === "note" ? "Team only" : "Client can see this"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
