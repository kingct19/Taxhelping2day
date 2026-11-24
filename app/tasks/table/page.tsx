import Link from "next/link";
import { LiniqoEmpty, liniqo } from "@/components/liniqo-empty";
import { TasksViewSwitcher } from "@/components/tasks/view-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveReturnWorkflow } from "@/lib/actions";
import { requireProfile } from "@/lib/auth";
import { loadDeskReturns, type DeskReturn } from "@/lib/desk-returns";
import { stages, type WaitingOn } from "@/lib/return-workflow";
import { stageTone } from "@/lib/status-tone";
import { getStore } from "@/lib/store";
import { taxpayerTypeLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const selectStyle = "h-8 appearance-none rounded-md bg-muted px-2.5 text-xs font-medium text-foreground outline-none";

function waitingLabel(waiting: Exclude<WaitingOn, null>) {
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

function waitingTone(waiting: Exclude<WaitingOn, null>) {
  switch (waiting) {
    case "staff":
      return "attention" as const;
    case "client":
      return "warning" as const;
    default: {
      const exhaustive: never = waiting;
      return exhaustive;
    }
  }
}

function initials(name: string) {
  const letters = name
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "?";
}

function sameParty(entity: string, name: string) {
  const tokens = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .sort()
      .join(" ");
  return tokens(entity) === tokens(name);
}

function dueLabel(due: string | null) {
  if (!due) return "No due date";
  const date = new Date(`${due}T00:00:00`);
  if (Number.isNaN(date.getTime())) return `Due ${due}`;
  return `Due ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

export default async function TasksTablePage({ searchParams }: { searchParams: Promise<{ conflict?: string }> }) {
  await requireProfile("staff");
  const { conflict } = await searchParams;
  const [rows, profiles] = await Promise.all([loadDeskReturns(), getStore().listProfiles()]);
  const teammates = profiles.filter((person) => person.role === "staff");
  const nameOf = (id: string) => {
    const person = profiles.find((item) => item.id === id);
    return person?.name || person?.email || "Teammate";
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
        <h1 className="text-base font-semibold">Tasks</h1>
        <div className="ml-auto flex items-center gap-2">
          <TasksViewSwitcher />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex flex-col gap-4 p-4">
          {conflict ? (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              This return changed before you saved. Open it and apply the change again.
            </p>
          ) : null}
          <Card>
            <CardContent className="flex flex-col gap-4">
              {rows.length === 0 ? (
                <LiniqoEmpty {...liniqo.taxDesk}>
                  No returns on the desk. Open one from the client’s <Link href="/contacts">contact</Link>.
                </LiniqoEmpty>
              ) : (
                <ul>
                  <li className="hidden grid-cols-[minmax(0,1.2fr)_8.5rem_minmax(0,1.4fr)_8rem_8rem_auto] items-center gap-3 border-b px-1 pb-2 text-xs text-muted-foreground lg:grid">
                    <span>Client</span>
                    <span>Stage</span>
                    <span>Next</span>
                    <span>Due</span>
                    <span>Preparer</span>
                    <span className="sr-only">Open</span>
                  </li>
                  {rows.map((item) => (
                    <ReturnRow key={item.id} item={item} teammates={teammates} nameOf={nameOf} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ReturnRow({
  item,
  teammates,
  nameOf,
}: {
  item: DeskReturn;
  teammates: { id: string }[];
  nameOf: (id: string) => string;
}) {
  const filedAs = sameParty(item.entity, item.clientName) ? null : item.entity;
  return (
    <li className="border-b py-3 last:border-b-0">
      <div className="grid items-center gap-3 lg:grid-cols-[minmax(0,1.2fr)_8.5rem_minmax(0,1.4fr)_8rem_8rem_auto]">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-9">
            {item.avatar ? <AvatarImage src={item.avatar} alt="" /> : null}
            <AvatarFallback className="text-xs">{initials(item.clientName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link href={`/returns/${item.profileId}/${item.id}`} className="block truncate text-sm font-medium hover:underline">
              {item.clientName}
            </Link>
            <p className="truncate text-xs text-muted-foreground">
              {item.taxYear} {taxpayerTypeLabel(item.taxpayerType).toLowerCase()}
              {filedAs ? ` · ${filedAs}` : ""}
              {item.clientEmail ? ` · ${item.clientEmail}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={stageTone(item.stage)}>{stages[item.stage]}</Badge>
          {item.waitingOn ? <Badge variant={waitingTone(item.waitingOn)}>{waitingLabel(item.waitingOn)}</Badge> : null}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.step}</p>
          {item.detail ? <p className="truncate text-xs text-muted-foreground">{item.detail}</p> : null}
        </div>
        <p className={cn("text-sm", item.overdue ? "font-medium text-red-600" : "text-muted-foreground")}>{dueLabel(item.due)}</p>
        <p className={cn("truncate text-sm", item.ownerId ? "text-foreground" : "text-muted-foreground")}>{item.ownerName}</p>
        <Link href={`/returns/${item.profileId}/${item.id}`} className={cn(buttonVariants({ size: "sm" }), "w-fit")}>
          Open return
        </Link>
      </div>
      <details key={item.revision} className="mt-2 lg:ps-12">
        <summary className="cursor-pointer text-xs text-muted-foreground">Assign</summary>
        <form action={saveReturnWorkflow.bind(null, item.id, item.revision)} className="mt-3 grid max-w-3xl gap-3 text-sm sm:grid-cols-3">
          <input type="hidden" name="returnTo" value="/tasks/table" />
          <label className="grid gap-1">
            Preparer
            <select className={selectStyle} name="owner" defaultValue={item.ownerId ?? ""}>
              <option value="">Unassigned</option>
              {teammates.map((person) => (
                <option key={person.id} value={person.id}>{nameOf(person.id)}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            Due date
            <Input type="date" name="due" defaultValue={item.due ?? ""} />
          </label>
          <label className="grid gap-1 sm:col-span-3">
            Note for the team
            <Input name="nextAction" maxLength={500} defaultValue={item.nextAction} placeholder="What should the next preparer know?" />
          </label>
          <Button className="w-fit" type="submit" variant="outline">Save assignment</Button>
        </form>
      </details>
    </li>
  );
}
