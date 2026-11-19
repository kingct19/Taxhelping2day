"use client";

import type { ReactNode } from "react";
import {
  AtSignIcon,
  CircleDashedIcon,
  ClockIcon,
  FlameIcon,
  InboxIcon,
  MessagesSquareIcon,
  ShieldAlertIcon,
  SquarePenIcon,
  StarIcon,
  type LucideIcon,
} from "lucide-react";
import { NewConversationDialog } from "@/components/inbox/new-conversation-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { InboxContact, InboxConversation } from "@/components/inbox/inbox-state";
import {
  countFolder,
  countTeam,
  countView,
  inboxFolderIds,
  inboxFolderLabel,
  inboxViewIds,
  inboxViewLabel,
  sameFilter,
  teamInboxLabel,
  type InboxFilter,
} from "@/lib/inbox-view";
import { teamInboxIds } from "@/lib/types";
import { cn } from "@/lib/utils";

const folderIcons: Record<(typeof inboxFolderIds)[number], LucideIcon> = {
  you: InboxIcon,
  mentions: AtSignIcon,
  created: SquarePenIcon,
  all: MessagesSquareIcon,
  unassigned: CircleDashedIcon,
  spam: ShieldAlertIcon,
};

const viewIcons: Record<(typeof inboxViewIds)[number], LucideIcon> = {
  starred: StarIcon,
  priority: FlameIcon,
  snoozed: ClockIcon,
};

function FolderButton({
  active,
  label,
  count,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="lg"
      aria-current={active ? "true" : undefined}
      className={cn(
        "h-9 w-full justify-start gap-2 font-normal",
        active && "bg-accent font-medium text-accent-foreground hover:bg-accent hover:text-accent-foreground",
      )}
      onClick={onClick}
    >
      {icon}
      <span className="flex-1 truncate text-left">{label}</span>
      {count > 0 ? <span className="text-xs text-muted-foreground tabular-nums">{count}</span> : null}
    </Button>
  );
}

export function InboxSidebar({
  conversations,
  userId,
  filter,
  contacts,
  onFilter,
  onCreated,
}: {
  conversations: InboxConversation[];
  userId: string;
  filter: InboxFilter;
  contacts: InboxContact[];
  onFilter: (filter: InboxFilter) => void;
  onCreated: (profileId: string) => void;
}) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-sidebar">
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <h1 className="text-base font-semibold">Inbox</h1>
        <NewConversationDialog
          contacts={contacts}
          onCreated={onCreated}
          trigger={
            <Button type="button" variant="ghost" size="icon" aria-label="New conversation">
              <SquarePenIcon />
            </Button>
          }
        />
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <nav className="flex flex-col gap-0.5 p-2">
          {inboxFolderIds.map((folder) => {
            const Icon = folderIcons[folder];
            const next = { type: "folder", id: folder } as const;
            return (
              <FolderButton
                key={folder}
                active={sameFilter(filter, next)}
                label={inboxFolderLabel(folder)}
                count={countFolder(conversations, folder, userId)}
                icon={<Icon className="text-muted-foreground" />}
                onClick={() => onFilter(next)}
              />
            );
          })}
        </nav>
        <div className="flex flex-col gap-0.5 p-2">
          <p className="px-2 py-2 text-xs font-medium text-muted-foreground">Views</p>
          {inboxViewIds.map((view) => {
            const Icon = viewIcons[view];
            const next = { type: "view", id: view } as const;
            return (
              <FolderButton
                key={view}
                active={sameFilter(filter, next)}
                label={inboxViewLabel(view)}
                count={countView(conversations, view)}
                icon={<Icon className="text-muted-foreground" />}
                onClick={() => onFilter(next)}
              />
            );
          })}
        </div>
        <div className="flex flex-col gap-0.5 p-2">
          <p className="px-2 py-2 text-xs font-medium text-muted-foreground">Team inboxes</p>
          {teamInboxIds.map((team) => {
            const next = { type: "team", id: team } as const;
            return (
              <FolderButton
                key={team}
                active={sameFilter(filter, next)}
                label={teamInboxLabel(team)}
                count={countTeam(conversations, team)}
                icon={<span className="flex size-5 items-center justify-center rounded bg-orange-500/15 text-xs">🔥</span>}
                onClick={() => onFilter(next)}
              />
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
