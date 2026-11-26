"use client";

import { useMemo, type ReactNode } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { BlockReady } from "@/components/dashboardblocks/block-state";
import { StatusLabel } from "@/components/dashboardblocks/status-label";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSavedState } from "@/hooks/use-saved-state";
import {
  isDueFilter,
  isWaitingFilter,
  matchesReturn,
  type DueFilter,
  type FilterableReturn,
  type WaitingFilter,
} from "@/lib/return-filters";

type ReturnFilterState = {
  query: string;
  waiting: WaitingFilter;
  due: DueFilter;
  owner: string;
  year: string;
};

const emptyFilters: ReturnFilterState = { query: "", waiting: "any", due: "any", owner: "any", year: "any" };

function isReturnFilterState(value: unknown): value is ReturnFilterState {
  if (!value || typeof value !== "object") return false;
  const item = value as ReturnFilterState;
  return typeof item.query === "string" && isWaitingFilter(item.waiting) && isDueFilter(item.due) && typeof item.owner === "string" && typeof item.year === "string";
}

export function useReturnFilters<T extends FilterableReturn>(items: T[], viewerId: string | null = null) {
  const [saved, setSaved] = useSavedState("view:return-filters", emptyFilters, isReturnFilterState);
  const { query, waiting, due, owner, year } = saved;
  const setQuery = (next: string) => setSaved((current) => ({ ...current, query: next }));
  const setWaiting = (next: WaitingFilter) => setSaved((current) => ({ ...current, waiting: next }));
  const setDue = (next: DueFilter) => setSaved((current) => ({ ...current, due: next }));
  const setOwner = (next: string) => setSaved((current) => ({ ...current, owner: next }));
  const setYear = (next: string) => setSaved((current) => ({ ...current, year: next }));
  const filtering = query.trim().length > 0 || waiting !== "any" || due !== "any" || owner !== "any" || year !== "any";
  const visible = useMemo(
    () => items.filter((item) => matchesReturn(item, { query, waiting, due, owner, year, viewerId })),
    [due, items, owner, query, viewerId, waiting, year],
  );
  const preparers = useMemo(() => {
    const names = new Set<string>();
    for (const item of items) {
      if (item.assignee) names.add(item.assignee);
    }
    return [...names].sort((left, right) => left.localeCompare(right));
  }, [items]);
  const years = useMemo(() => [...new Set(items.map((item) => item.year))].sort((left, right) => right - left), [items]);

  function clear() {
    setSaved(emptyFilters);
  }

  return { query, setQuery, waiting, setWaiting, due, setDue, owner, setOwner, year, setYear, preparers, years, viewerId, filtering, visible, clear };
}

export function ReturnFilterControls({
  filters,
}: {
  filters: Pick<
    ReturnType<typeof useReturnFilters>,
    "query" | "setQuery" | "waiting" | "setWaiting" | "due" | "setDue" | "owner" | "setOwner" | "year" | "setYear" | "preparers" | "years" | "viewerId" | "filtering" | "clear"
  >;
}) {
  const ownerOptions = [
    { label: "Any preparer", value: "any" },
    ...(filters.viewerId ? [{ label: "Assigned to me", value: "mine" }] : []),
    { label: "Unassigned", value: "unassigned" },
    ...filters.preparers.map((name) => ({ label: name, value: `name:${name}` })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <InputGroup className="h-8 w-full bg-transparent sm:w-64">
        <InputGroupAddon>
          <SearchIcon className="size-4" />
        </InputGroupAddon>
        <InputGroupInput aria-label="Search returns" placeholder="Name, email, or year" value={filters.query} onChange={(event) => filters.setQuery(event.target.value)} />
        {filters.query ? (
          <button type="button" aria-label="Clear search" className="text-muted-foreground hover:text-foreground" onClick={() => filters.setQuery("")}>
            <XIcon className="size-3.5" />
          </button>
        ) : null}
      </InputGroup>
      <FilterSelect
        label="Waiting"
        value={filters.waiting}
        options={[
          { label: "Any waiting", value: "any" },
          { label: "On you", value: "staff" },
          { label: "On the client", value: "client" },
        ]}
        onChange={(next) => {
          if (isWaitingFilter(next)) filters.setWaiting(next);
        }}
      />
      <FilterSelect
        label="Due"
        value={filters.due}
        options={[
          { label: "Any date", value: "any" },
          { label: "Late", value: "late" },
        ]}
        onChange={(next) => {
          if (isDueFilter(next)) filters.setDue(next);
        }}
      />
      <FilterSelect label="Preparer" value={filters.owner} options={ownerOptions} onChange={filters.setOwner} />
      {filters.years.length > 1 ? (
        <FilterSelect
          label="Year"
          value={filters.year}
          options={[{ label: "Any year", value: "any" }, ...filters.years.map((value) => ({ label: String(value), value: String(value) }))]}
          onChange={filters.setYear}
        />
      ) : null}
      {filters.filtering ? (
        <Button type="button" variant="ghost" size="sm" onClick={filters.clear}>
          Clear
        </Button>
      ) : null}
    </div>
  );
}

export function ReturnFilterSummary({ items, total }: { items: FilterableReturn[]; total: number }) {
  const open = items.filter((item) => !item.settled).length;
  const onYou = items.filter((item) => item.waiting === "staff").length;
  const onClient = items.filter((item) => item.waiting === "client").length;
  const late = items.filter((item) => item.overdue).length;
  const narrowed = items.length !== total;
  return (
    <BlockReady className="text-sm">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {narrowed ? `Showing ${items.length} of ${total}${items.length === 0 ? "." : ". "}` : null}
        {items.length === 0 && narrowed ? null : (
          <>
            {open} open,{" "}
            <StatusLabel variant="text" tone={onYou > 0 ? "warning" : "neutral"} className="text-sm">
              {onYou} on you
            </StatusLabel>
            ,{" "}
            <StatusLabel variant="text" tone={onClient > 0 ? "info" : "neutral"} className="text-sm">
              {onClient} on the client
            </StatusLabel>
            {late > 0 ? (
              <>
                ,{" "}
                <StatusLabel variant="text" tone="bad" className="text-sm">
                  {late} late
                </StatusLabel>
              </>
            ) : null}
          </>
        )}
      </p>
    </BlockReady>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Select items={options} value={value} onValueChange={(next) => { if (next) onChange(next); }}>
      <SelectTrigger size="sm" aria-label={label} className="h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function ReturnFilters<T extends FilterableReturn>({
  items,
  viewerId,
  children,
}: {
  items: T[];
  viewerId?: string | null;
  children: (visible: T[], filtering: boolean) => ReactNode;
}) {
  const filters = useReturnFilters(items, viewerId);
  return (
    <>
      <ReturnFilterControls filters={filters} />
      <ReturnFilterSummary items={filters.visible} total={items.length} />
      {children(filters.visible, filters.filtering)}
    </>
  );
}
