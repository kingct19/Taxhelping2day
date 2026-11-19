import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveReturnWorkflow } from "@/lib/actions";
import { requireProfile } from "@/lib/auth";
import { staffNext } from "@/lib/next-action";
import { requestThreads } from "@/lib/request-thread";
import { stages } from "@/lib/return-workflow";
import { stageTone } from "@/lib/status-tone";
import { getStore } from "@/lib/store";
import { taxpayerTypeLabel, type Message } from "@/lib/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const selectStyle = "h-8 rounded-lg border bg-background px-2 text-sm";

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

export default async function ReturnsPage({ searchParams }: {
  searchParams: Promise<{ owner?: string; stage?: string; requests?: string; q?: string; conflict?: string }>;
}) {
  const staff = await requireProfile("staff");
  const query = await searchParams;
  const store = getStore();
  const [returns, profiles, requestRows, filings, authorizations] = await Promise.all([
    store.listTeamReturns(), store.listProfiles(), store.listRequestStates(), store.listFilings(), store.listAuthorizations(),
  ]);
  const people = new Map(profiles.map((person) => [person.id, person]));
  const teammates = profiles.filter((person) => person.role === "staff");
  const nameOf = (id: string | null | undefined) => {
    if (!id) return "";
    const person = people.get(id);
    return person?.name || person?.email || "";
  };
  const messages = requestRows.filter((row): row is typeof row & { requestState: NonNullable<typeof row.requestState> } => Boolean(row.requestState));
  const rows = returns.filter((item) => {
    const clientName = nameOf(item.profileId);
    if (query.q && ![item.entity, String(item.taxYear), clientName, people.get(item.profileId)?.email].join(" ").toLowerCase().includes(query.q.trim().toLowerCase())) return false;
    if (query.owner === "mine" && item.owner !== staff.id) return false;
    if (query.owner === "unassigned" && item.owner) return false;
    return query.stage ? item.stage === query.stage : item.stage !== "closed";
  }).map((item) => {
    const clientName = nameOf(item.profileId) || "Unnamed customer";
    const threads = requestThreads(messages.filter((row) => row.returnId === item.id) as Message[]);
    const next = staffNext({
      name: clientName,
      due: item.due,
      stage: item.stage,
      threads,
      filings: filings.filter((row) => row.returnId === item.id),
      authorizations: authorizations.filter((row) => row.returnId === item.id),
      returnVersion: item.returnVersion,
    });
    return { item, next, threads, clientName };
  }).filter(({ threads }) => {
    if (query.requests === "review") return threads.some((thread) => thread.latest.requestState === "responded" || thread.latest.requestState === "unavailable");
    if (query.requests === "waiting") return threads.some((thread) => thread.latest.requestState === "open" || thread.latest.requestState === "replacement");
    return true;
  }).sort((a, b) => a.next.urgency - b.next.urgency || (a.item.due ?? "9999").localeCompare(b.item.due ?? "9999"));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-col gap-4 border-b px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h1 className="text-base font-semibold">Returns</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Each row is one customer’s tax return for a year. Open it to review what they sent, ask for what is missing, and record the filing.
            </p>
          </div>
          <Link href="/returns/samples" className="text-sm text-muted-foreground underline">
            Sample clients
          </Link>
        </div>
        {query.conflict ? (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            This return changed before you saved. Open it and apply the change again.
          </p>
        ) : null}
        <form className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Find a customer
            <Input name="q" defaultValue={query.q} placeholder="Name, email, or year" className="w-56" />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Preparer
            <select className={selectStyle} name="owner" defaultValue={query.owner ?? ""}>
              <option value="">Anyone</option>
              <option value="mine">Assigned to me</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Where it stands
            <select className={selectStyle} name="stage" defaultValue={query.stage ?? ""}>
              <option value="">Open returns</option>
              {Object.entries(stages).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Waiting on
            <select className={selectStyle} name="requests" defaultValue={query.requests ?? ""}>
              <option value="">Anyone</option>
              <option value="review">The firm, to review a file</option>
              <option value="waiting">The customer</option>
            </select>
          </label>
          <Button type="submit" variant="outline">Show</Button>
          <p className="pb-1.5 text-sm text-muted-foreground tabular-nums">
            {rows.length} {rows.length === 1 ? "return" : "returns"}
          </p>
        </form>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-sm text-muted-foreground">
            No returns in this view. A return is opened from the customer’s <Link className="underline" href="/contacts">contact</Link>.
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map(({ item, next, clientName }) => {
              const email = people.get(item.profileId)?.email;
              const filedAs = sameParty(item.entity, clientName) ? null : item.entity;
              const owner = nameOf(item.owner) || "Unassigned";
              return (
                <li key={item.id} className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="mt-0.5 size-9">
                      <AvatarFallback className="text-xs">{initials(clientName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-medium">
                          <Link href={`/returns/${item.profileId}/${item.id}`} className="hover:underline">
                            {clientName}
                          </Link>
                        </h2>
                        <Badge variant={stageTone(item.stage)}>{stages[item.stage]}</Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {item.taxYear} {taxpayerTypeLabel(item.taxpayerType).toLowerCase()} return
                        {filedAs ? ` · Filed as ${filedAs}` : ""}
                        {email ? ` · ${email}` : ""}
                      </p>
                      <p className="mt-2 text-sm">
                        <span className="text-muted-foreground">Next on this return · </span>
                        {next.headline}
                      </p>
                      {next.detail ? <p className="text-sm text-muted-foreground">{next.detail}</p> : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {owner} · {dueLabel(item.due)}
                      </p>
                    </div>
                    <Link href={`/returns/${item.profileId}/${item.id}`} className={cn(buttonVariants({ size: "sm" }), "shrink-0")}>
                      Open return
                    </Link>
                  </div>
                  <details key={item.revision} className="mt-3 ml-12">
                    <summary className="cursor-pointer text-sm text-muted-foreground">Assign this return</summary>
                    <p className="mt-2 max-w-xl text-xs text-muted-foreground">
                      Set who is preparing it and when it is due. Reviewing files and recording the filing happen inside the return.
                    </p>
                    <form action={saveReturnWorkflow.bind(null, item.id, item.revision)} className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                      <label className="grid gap-1">
                        Where it stands
                        <select className={selectStyle} name="stage" defaultValue={item.stage}>
                          {Object.entries(stages).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1">
                        Preparer
                        <select className={selectStyle} name="owner" defaultValue={item.owner ?? ""}>
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
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
