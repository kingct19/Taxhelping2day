"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownWideNarrowIcon, SearchIcon, StarIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { inboxFolderLabel, inboxHref, type InboxFolderId, type InboxRow } from "@/lib/inbox-view";
import { seasonLabel } from "@/lib/season";
import { taxpayerTypeLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

type Sort = "latest" | "name";

function sortLabel(sort: Sort) {
  switch (sort) {
    case "latest":
      return "Last activity";
    case "name":
      return "Name";
    default: {
      const exhaustive: never = sort;
      return exhaustive;
    }
  }
}

function initials(name: string, email: string) {
  const source = name.trim() || email;
  const parts = source.split(/[\s@]+/).filter(Boolean).slice(0, 2);
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return letters || "?";
}

function relativeTime(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (Number.isNaN(delta) || delta < minute) return "now";
  if (delta < hour) return `${Math.floor(delta / minute)}m`;
  if (delta < day) return `${Math.floor(delta / hour)}h`;
  return `${Math.floor(delta / day)}d`;
}

export function ClientList({
  rows,
  selectedId,
  folder,
  className,
}: {
  rows: InboxRow[];
  selectedId: string | null;
  folder: InboxFolderId;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("latest");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = needle
      ? rows.filter((row) => `${row.name} ${row.email}`.toLowerCase().includes(needle))
      : rows;
    return [...matched].sort((a, b) => {
      switch (sort) {
        case "name":
          return (a.name || a.email).localeCompare(b.name || b.email);
        case "latest":
          return b.createdAt.localeCompare(a.createdAt);
        default: {
          const exhaustive: never = sort;
          return exhaustive;
        }
      }
    });
  }, [query, rows, sort]);

  return (
    <div className={cn("flex h-full w-full shrink-0 flex-col border-r md:w-80 xl:w-[22rem]", className)}>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <h2 className="truncate text-base font-semibold">{inboxFolderLabel(folder)}</h2>
        <span className="text-sm text-muted-foreground tabular-nums">{visible.length}</span>
      </div>
      <div className="flex flex-col gap-2 border-b p-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search clients"
            className="h-8 pl-8"
          />
        </div>
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-muted-foreground tabular-nums">{visible.length} files</span>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" />}>
              <ArrowDownWideNarrowIcon />
              {sortLabel(sort)}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={sort} onValueChange={(value) => setSort(value === "name" ? "name" : "latest")}>
                <DropdownMenuRadioItem value="latest">Last activity</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {visible.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No clients in this folder.</p>
        ) : (
          <ul className="flex flex-col gap-1 p-3">
            {visible.map((row) => {
              const active = row.id === selectedId;
              return (
                <li key={row.id}>
                  <Link
                    href={inboxHref(folder, row.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-start gap-3 rounded-lg px-2.5 py-2.5 hover:bg-muted/60",
                      active && "bg-primary/5 ring-1 ring-primary/30",
                    )}
                  >
                    <Avatar>
                      <AvatarFallback className="text-xs">{initials(row.name, row.email)}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="flex min-w-0 flex-1 items-center gap-1 truncate text-sm font-medium">
                          <span className="truncate">{row.name || row.email}</span>
                          {row.starred ? <StarIcon className="size-3 shrink-0 fill-primary text-primary" /> : null}
                        </span>
                        <span className="shrink-0 text-xs font-normal text-muted-foreground">{relativeTime(row.createdAt)}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {taxpayerTypeLabel(row.taxpayerType)} · {seasonLabel(row.stage)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
