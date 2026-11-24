"use client";

import { useState, type ReactNode } from "react";
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

const filters: { id: "all" | ActivityGroup; label: string }[] = [
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
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const visible = items.filter((item) => filter === "all" || item.group === filter);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Activity filters">
        {filters.map((item) => (
          <Button key={item.id} type="button" size="sm" variant={filter === item.id ? "secondary" : "ghost"} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
            {item.label}
          </Button>
        ))}
      </div>
      {visible.length === 0 ? <p className="text-sm text-muted-foreground">Nothing in this view.</p> : null}
    <ActivityFeed>
      {visible.map((item) => (
        <ActivityFeedItem key={item.id} connector className="items-start">
          <ActivityIcon icon={iconFor(item.icon)} tone={item.tone} />
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
    </div>
  );
}
