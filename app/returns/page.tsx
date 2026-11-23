import Link from "next/link";
import { LiniqoArt, LiniqoEmpty, liniqo } from "@/components/liniqo-empty";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveReturnWorkflow } from "@/lib/actions";
import { requireProfile } from "@/lib/auth";
import { staffNext } from "@/lib/next-action";
import { requestThreads } from "@/lib/request-thread";
import { stages, type WaitingOn } from "@/lib/return-workflow";
import { stageTone } from "@/lib/status-tone";
import { getStore } from "@/lib/store";
import { taxpayerTypeLabel, type Message } from "@/lib/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const selectStyle = "h-8 appearance-none rounded-md bg-muted px-2.5 text-xs font-medium text-foreground outline-none";

function waitingFilter(value: string | undefined): Exclude<WaitingOn, null> | undefined {
  if (value === "staff" || value === "client") return value;
  return undefined;
}

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

function boardHref(current: { q?: string; owner?: string; stage?: string; requests?: string; waiting?: string }, patch: { q?: string | null; owner?: string | null; stage?: string | null; requests?: string | null; waiting?: string | null }) {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value) params.set(key, value);
  }
  const search = params.toString();
  return search ? `/returns?${search}` : "/returns";
}

function todayStamp() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
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

export default async function ReturnsPage({ searchParams }: {
  searchParams: Promise<{ owner?: string; stage?: string; requests?: string; waiting?: string; q?: string; conflict?: string }>;
}) {
  const staff = await requireProfile("staff");
  const query = await searchParams;
  const waiting = waitingFilter(query.waiting);
  const today = todayStamp();
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
    return query.stage ? item.stage === query.stage : item.stage !== "renewal";
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
  const onStaff = rows.filter((row) => row.item.waitingOn === "staff").length;
  const onClient = rows.filter((row) => row.item.waitingOn === "client").length;
  const unassigned = rows.filter((row) => !row.item.owner).length;
  const visible = rows.filter((row) => {
    if (query.owner === "mine" && row.item.owner !== staff.id) return false;
    if (query.owner === "unassigned" && row.item.owner) return false;
    if (waiting && row.item.waitingOn !== waiting) return false;
    return true;
  });
  const filters = { q: query.q, owner: query.owner, stage: query.stage, requests: query.requests, waiting };

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold tracking-tight">Returns</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with the returns waiting on the firm. Open one to review what came in, ask for what is missing, and record the filing.
            </p>
          </div>
          <Link href="/returns/samples" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Sample clients
          </Link>
        </div>
        {query.conflict ? (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            This return changed before you saved. Open it and apply the change again.
          </p>
        ) : null}
        <div className="grid grid-cols-12 gap-4">
          <QueueCard
            href={boardHref(filters, { waiting: waiting === "staff" ? null : "staff" })}
            label="On you"
            value={onStaff}
            hint="The firm owes the next step"
            active={waiting === "staff"}
            art="person-at-laptop-desk"
          />
          <QueueCard
            href={boardHref(filters, { waiting: waiting === "client" ? null : "client" })}
            label="On the client"
            value={onClient}
            hint="Waiting for something from them"
            active={waiting === "client"}
            art="person-sending-message"
          />
          <QueueCard
            href={boardHref(filters, { owner: query.owner === "unassigned" ? null : "unassigned" })}
            label="Unassigned"
            value={unassigned}
            hint="No preparer yet"
            active={query.owner === "unassigned"}
            art="cubicle"
          />
        </div>
        <Card>
          <CardContent className="flex flex-col gap-4">
            <form className="flex flex-wrap items-end gap-3">
              {waiting ? <input type="hidden" name="waiting" value={waiting} /> : null}
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
                Stage
                <select className={selectStyle} name="stage" defaultValue={query.stage ?? ""}>
                  <option value="">Open returns</option>
                  {Object.entries(stages).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Documents
                <select className={selectStyle} name="requests" defaultValue={query.requests ?? ""}>
                  <option value="">Any documents</option>
                  <option value="review">Ready for the firm to review</option>
                  <option value="waiting">Still with the customer</option>
                </select>
              </label>
              <Button type="submit" variant="outline">Show</Button>
              <p className="pb-1.5 text-sm text-muted-foreground tabular-nums">
                {visible.length} {visible.length === 1 ? "return" : "returns"}
              </p>
            </form>
            {visible.length === 0 ? (
              <LiniqoEmpty {...liniqo.taxDesk}>
                No returns in this view. A return is opened from the customer’s <Link href="/contacts">contact</Link>.
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
                {visible.map(({ item, next, clientName }) => {
                  const email = people.get(item.profileId)?.email;
                  const filedAs = sameParty(item.entity, clientName) ? null : item.entity;
                  const owner = nameOf(item.owner) || "Unassigned";
                  const overdue = Boolean(item.due && item.due < today);
                  return (
                    <li key={item.id} className="border-b py-3 last:border-b-0">
                      <div className="grid items-center gap-3 lg:grid-cols-[minmax(0,1.2fr)_8.5rem_minmax(0,1.4fr)_8rem_8rem_auto]">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarFallback className="text-xs">{initials(clientName)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <Link href={`/returns/${item.profileId}/${item.id}`} className="block truncate text-sm font-medium hover:underline">
                              {clientName}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">
                              {item.taxYear} {taxpayerTypeLabel(item.taxpayerType).toLowerCase()}
                              {filedAs ? ` · ${filedAs}` : ""}
                              {email ? ` · ${email}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={stageTone(item.stage)}>{stages[item.stage]}</Badge>
                          {item.waitingOn ? <Badge variant={waitingTone(item.waitingOn)}>{waitingLabel(item.waitingOn)}</Badge> : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{next.headline}</p>
                          {next.detail ? <p className="truncate text-xs text-muted-foreground">{next.detail}</p> : null}
                        </div>
                        <p className={cn("text-sm", overdue ? "font-medium text-red-600" : "text-muted-foreground")}>{dueLabel(item.due)}</p>
                        <p className={cn("truncate text-sm", item.owner ? "text-foreground" : "text-muted-foreground")}>{owner}</p>
                        <Link href={`/returns/${item.profileId}/${item.id}`} className={cn(buttonVariants({ size: "sm" }), "w-fit")}>
                          Open return
                        </Link>
                      </div>
                      <details key={item.revision} className="mt-2 lg:ps-12">
                        <summary className="cursor-pointer text-xs text-muted-foreground">Assign</summary>
                        <form action={saveReturnWorkflow.bind(null, item.id, item.revision)} className="mt-3 grid max-w-3xl gap-3 text-sm sm:grid-cols-3">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QueueCard({ href, label, value, hint, active, art }: {
  href: string;
  label: string;
  value: number;
  hint: string;
  active: boolean;
  art: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative col-span-12 flex min-h-36 flex-col gap-1 overflow-hidden rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 lg:col-span-4 lg:pe-36",
        active && "ring-2 ring-foreground/40",
      )}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value.toLocaleString("en-US")}</span>
      <span className="text-xs text-muted-foreground">{active ? "Showing these returns" : hint}</span>
      <LiniqoArt id={art} className="absolute bottom-0 end-1 hidden size-32 lg:block" />
    </Link>
  );
}
