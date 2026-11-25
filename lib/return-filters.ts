import type { DeskReturn } from "@/lib/desk-returns";
import { stages } from "@/lib/return-workflow";

export const waitingFilters = ["any", "staff", "client"] as const;
export const dueFilters = ["any", "late"] as const;

export type WaitingFilter = (typeof waitingFilters)[number];
export type DueFilter = (typeof dueFilters)[number];

export type FilterableReturn = {
  assignee: string | null;
  ownerId?: string | null;
  client: string;
  email?: string;
  entity?: string;
  title: string;
  detail?: string;
  step?: string;
  stage?: string;
  note?: string;
  overdue: boolean;
  settled: boolean;
  waiting: "client" | "staff" | null;
  year: number;
};

export function isWaitingFilter(value: string): value is WaitingFilter {
  return (waitingFilters as readonly string[]).includes(value);
}

export function isDueFilter(value: string): value is DueFilter {
  return (dueFilters as readonly string[]).includes(value);
}

export function toFilterableReturn(row: DeskReturn): FilterableReturn {
  return {
    assignee: row.ownerName === "Unassigned" ? null : row.ownerName,
    ownerId: row.ownerId,
    client: row.clientName,
    email: row.clientEmail,
    entity: row.entity,
    title: row.headline,
    detail: row.detail,
    step: row.step,
    stage: stages[row.stage],
    note: row.nextAction,
    overdue: row.overdue,
    settled: row.stage === "delivery" || row.stage === "renewal",
    waiting: row.waitingOn,
    year: row.taxYear,
  };
}

export function returnHaystack(item: FilterableReturn) {
  return [item.title, item.client, item.email ?? "", item.entity ?? "", item.assignee ?? "", item.detail ?? "", item.step ?? "", item.stage ?? "", item.note ?? "", String(item.year)]
    .join(" ")
    .toLowerCase();
}

export function matchesWaiting(item: FilterableReturn, waiting: WaitingFilter) {
  switch (waiting) {
    case "any":
      return true;
    case "staff":
      return item.waiting === "staff";
    case "client":
      return item.waiting === "client";
    default: {
      const exhaustive: never = waiting;
      return exhaustive;
    }
  }
}

export function matchesDue(item: FilterableReturn, due: DueFilter) {
  switch (due) {
    case "any":
      return true;
    case "late":
      return item.overdue;
    default: {
      const exhaustive: never = due;
      return exhaustive;
    }
  }
}

export function matchesOwner(item: FilterableReturn, owner: string, viewerId: string | null) {
  if (owner === "any") return true;
  if (owner === "mine") return Boolean(viewerId) && item.ownerId === viewerId;
  if (owner === "unassigned") return !item.assignee;
  return owner.startsWith("name:") && item.assignee === owner.slice("name:".length);
}

export function matchesReturn(
  item: FilterableReturn,
  filters: { query: string; waiting: WaitingFilter; due: DueFilter; owner: string; year: string; viewerId: string | null },
) {
  const needle = filters.query.trim().toLowerCase();
  if (needle && !returnHaystack(item).includes(needle)) return false;
  if (!matchesWaiting(item, filters.waiting)) return false;
  if (!matchesDue(item, filters.due)) return false;
  if (!matchesOwner(item, filters.owner, filters.viewerId)) return false;
  if (filters.year !== "any" && String(item.year) !== filters.year) return false;
  return true;
}
