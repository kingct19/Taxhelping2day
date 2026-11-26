"use client";

import { useState, type ReactNode } from "react";
import { useSavedState } from "@/hooks/use-saved-state";
import {
  BadgeCheckIcon,
  BellIcon,
  CalendarClockIcon,
  CalendarXIcon,
  CircleAlertIcon,
  ClipboardListIcon,
  FileCheckIcon,
  FileIcon,
  FileMinusIcon,
  FileSearchIcon,
  FileSignatureIcon,
  FileUpIcon,
  FileXIcon,
  LandmarkIcon,
  ListChecksIcon,
  MessageSquareIcon,
  MonitorIcon,
  NotebookPenIcon,
  PenLineIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SendIcon,
  StickyNoteIcon,
  Undo2Icon,
  UserMinusIcon,
  UserRoundCheckIcon,
  UserRoundIcon,
  InboxIcon,
  ClipboardPenIcon,
} from "lucide-react";
import { ActivityFeed, ActivityFeedItem, ActivityIcon } from "@/components/dashboardblocks/activity-feed";
import { Button } from "@/components/ui/button";
import type { ActivityGroup, ActivityIconName, ActivityToneName } from "@/lib/return-progress";

export type ActivityItem = {
  id: string;
  label: string;
  body: string;
  when: string;
  actor: string;
  audience: string;
  tone: ActivityToneName;
  icon: ActivityIconName;
  group: ActivityGroup;
};

const pageSize = 8;

const iconColor: Record<ActivityIconName, string> = {
  update: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  message: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  note: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
  "client-request": "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  organizer: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  uploaded: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  document: "bg-cyan-500/15 text-cyan-800 dark:text-cyan-300",
  "document-review": "bg-teal-500/15 text-teal-800 dark:text-teal-300",
  accepted: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  unavailable: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  replacement: "bg-orange-500/15 text-orange-800 dark:text-orange-300",
  waived: "bg-stone-500/15 text-stone-700 dark:text-stone-300",
  authorization: "bg-fuchsia-500/15 text-fuchsia-800 dark:text-fuchsia-300",
  filing: "bg-yellow-500/20 text-yellow-800 dark:text-yellow-300",
  delivery: "bg-green-500/15 text-green-800 dark:text-green-300",
  stage: "bg-orange-500/15 text-orange-800 dark:text-orange-300",
  "review-approval": "bg-emerald-600/15 text-emerald-900 dark:text-emerald-200",
  review: "bg-red-500/15 text-red-700 dark:text-red-300",
  "review-reopened": "bg-rose-600/15 text-rose-800 dark:text-rose-300",
  "review-checklist": "bg-amber-600/15 text-amber-900 dark:text-amber-200",
  "preparation-submitted": "bg-blue-600/15 text-blue-800 dark:text-blue-300",
  "preparation-issue": "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  "preparation-checklist": "bg-cyan-600/15 text-cyan-900 dark:text-cyan-200",
  "tax-software": "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  assigned: "bg-lime-500/20 text-lime-800 dark:text-lime-300",
  "cleared-preparer": "bg-stone-500/15 text-stone-600 dark:text-stone-300",
  "cleared-reviewer": "bg-neutral-500/15 text-neutral-700 dark:text-neutral-300",
  "due-date": "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  "due-date-cleared": "bg-purple-500/10 text-purple-600 dark:text-purple-300",
};

type ActivityFilter = "all" | ActivityGroup;

function isActivityFilter(value: unknown): value is ActivityFilter {
  return filters.some((item) => item.id === value);
}

const filters: { id: ActivityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "documents", label: "Documents" },
  { id: "preparation", label: "Preparation" },
  { id: "reviews", label: "Reviews" },
  { id: "signatures", label: "Signatures" },
  { id: "filing", label: "Filing" },
  { id: "messages", label: "Messages" },
  { id: "assignments", label: "Assignments" },
];

function iconFor(icon: ActivityIconName): ReactNode {
  switch (icon) {
    case "authorization":
      return <FileSignatureIcon />;
    case "filing":
      return <LandmarkIcon />;
    case "delivery":
      return <SendIcon />;
    case "stage":
      return <Undo2Icon />;
    case "review-approval":
      return <BadgeCheckIcon />;
    case "review":
      return <CircleAlertIcon />;
    case "review-reopened":
      return <RotateCcwIcon />;
    case "review-checklist":
      return <ListChecksIcon />;
    case "preparation-submitted":
      return <ClipboardPenIcon />;
    case "preparation-issue":
      return <PenLineIcon />;
    case "preparation-checklist":
      return <ClipboardListIcon />;
    case "tax-software":
      return <MonitorIcon />;
    case "assigned":
      return <UserRoundCheckIcon />;
    case "cleared-preparer":
      return <UserMinusIcon />;
    case "cleared-reviewer":
      return <UserRoundIcon />;
    case "due-date":
      return <CalendarClockIcon />;
    case "due-date-cleared":
      return <CalendarXIcon />;
    case "document-review":
      return <FileSearchIcon />;
    case "client-request":
      return <InboxIcon />;
    case "organizer":
      return <NotebookPenIcon />;
    case "uploaded":
      return <FileUpIcon />;
    case "unavailable":
      return <FileXIcon />;
    case "replacement":
      return <RefreshCwIcon />;
    case "accepted":
      return <FileCheckIcon />;
    case "waived":
      return <FileMinusIcon />;
    case "document":
      return <FileIcon />;
    case "note":
      return <StickyNoteIcon />;
    case "update":
      return <BellIcon />;
    case "message":
      return <MessageSquareIcon />;
    default: {
      const exhaustive: never = icon;
      return exhaustive;
    }
  }
}

export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  const [filter, setFilter] = useSavedState<ActivityFilter>("view:activity", "all", isActivityFilter);
  const [page, setPage] = useState(0);
  const filtered = items.filter((item) => filter === "all" || item.group === filter);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * pageSize, currentPage * pageSize + pageSize);
  const from = filtered.length === 0 ? 0 : currentPage * pageSize + 1;
  const to = Math.min(filtered.length, (currentPage + 1) * pageSize);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Activity filters">
        {filters.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={filter === item.id ? "secondary" : "ghost"}
            aria-pressed={filter === item.id}
            onClick={() => {
              setFilter(item.id);
              setPage(0);
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>
      {filtered.length === 0 ? <p className="text-sm text-muted-foreground">Nothing in this view.</p> : null}
      <ActivityFeed>
        {visible.map((item) => (
          <ActivityFeedItem key={item.id} connector className="items-start">
            <ActivityIcon icon={iconFor(item.icon)} tone={item.tone} className={iconColor[item.icon]} />
            <div className="min-w-0 flex-1 pb-4">
              <p className="flex min-h-8 items-center text-xs leading-4 text-muted-foreground">
                {item.label}
                {" · "}
                {item.actor}
                {" · "}
                {item.when}
                {" · "}
                {item.audience}
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{item.body}</p>
            </div>
          </ActivityFeedItem>
        ))}
      </ActivityFeed>
      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{from}–{to} of {filtered.length.toLocaleString("en-US")}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
              Previous
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
