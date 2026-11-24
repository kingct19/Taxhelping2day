import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveReturnDesk } from "@/lib/actions";
import type { CheckItem, DeskIssue, ReturnDesk } from "@/lib/return-desk";
import { returnFieldClass } from "@/lib/return-progress";

type Person = { id: string; name: string };

function priorityLabel(priority: DeskIssue["priority"]): string {
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

export function DeskChecklist({
  profileId,
  returnId,
  revision,
  area,
  items,
  saved,
}: {
  profileId: string;
  returnId: string;
  revision: number;
  area: "preparation" | "review";
  items: CheckItem[];
  saved: ReturnDesk["preparationChecks"];
}) {
  const action = saveReturnDesk.bind(null, profileId, returnId, revision);
  return (
    <ul className="grid">
      {items.map((item) => {
        const done = Boolean(saved[item.key]?.done);
        return (
          <li key={item.key} className="border-t first:border-t-0">
            <form action={action} className="flex items-center justify-between gap-3 py-2">
              <input type="hidden" name="intent" value="check" />
              <input type="hidden" name="area" value={area} />
              <input type="hidden" name="key" value={item.key} />
              <input type="hidden" name="done" value={done ? "0" : "1"} />
              <span className="min-w-0">
                <span className="block text-sm">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.required ? "Required" : "Optional"}</span>
              </span>
              <Button type="submit" size="sm" variant={done ? "outline" : "default"} className="shrink-0">{done ? "Reopen" : "Mark done"}</Button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}

export function DeskIssues({
  profileId,
  returnId,
  revision,
  area,
  issues,
  teammates,
}: {
  profileId: string;
  returnId: string;
  revision: number;
  area: "preparation" | "review";
  issues: DeskIssue[];
  teammates: Person[];
}) {
  const action = saveReturnDesk.bind(null, profileId, returnId, revision);
  const rows = issues.filter((issue) => issue.area === area);
  return (
    <div className="grid gap-3">
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No issues yet.</p> : (
        <ul className="grid gap-2">
          {rows.map((issue) => (
            <li key={issue.id} className="flex items-start justify-between gap-3 rounded-lg border px-3 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{issue.title}</p>
                {issue.detail ? <p className="mt-0.5 line-clamp-2 text-muted-foreground">{issue.detail}</p> : null}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant={issue.priority === "high" ? "warning" : "neutral"}>{priorityLabel(issue.priority)}</Badge>
                  <Badge variant={issue.blocking ? "destructive" : "neutral"}>{issue.blocking ? "Blocking" : "Not blocking"}</Badge>
                  <Badge variant={issue.status === "open" ? "progress" : "success"}>{issue.status === "open" ? "Open" : "Resolved"}</Badge>
                </div>
              </div>
              <form action={action} className="shrink-0">
                <input type="hidden" name="intent" value={issue.status === "open" ? "resolve" : "reopen"} />
                <input type="hidden" name="id" value={issue.id} />
                <Button type="submit" size="sm" variant={issue.status === "open" ? "default" : "outline"}>{issue.status === "open" ? "Resolve" : "Reopen"}</Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={action} className="grid gap-3 border-t pt-3">
        <input type="hidden" name="intent" value="issue" />
        <input type="hidden" name="area" value={area} />
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Title</span>
          <Input name="title" required maxLength={120} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Description</span>
          <Textarea name="detail" maxLength={1000} rows={2} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Priority</span>
          <select className={returnFieldClass} name="priority" defaultValue="normal">
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Assigned to</span>
          <select className={returnFieldClass} name="assignee" defaultValue="">
            <option value="">Unassigned</option>
            {teammates.map((person) => (
              <option key={person.id} value={person.id}>{person.name}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="blocking" value="1" />
          Blocking
        </label>
        <Button type="submit" size="sm" className="w-fit">Add issue</Button>
      </form>
    </div>
  );
}
