"use client";

import { PresenceAvatar } from "@/components/inbox/presence-avatar";
import type { InboxConversation } from "@/components/inbox/inbox-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime, initials } from "@/lib/inbox-view";
import { cn } from "@/lib/utils";

export function ConversationListItem({
  conversation,
  active,
  onSelect,
}: {
  conversation: InboxConversation;
  active: boolean;
  onSelect: () => void;
}) {
  const lastMessage = conversation.messages.at(-1);
  const unread = conversation.unreadCount > 0;

  return (
    <li>
      <Button
        type="button"
        variant="ghost"
        onClick={onSelect}
        aria-current={active ? true : undefined}
        className={cn(
          "h-auto w-full items-start justify-start gap-3 rounded-lg border-0 px-2.5 py-2.5 text-left whitespace-normal ring-0 hover:bg-muted/60 active:not-aria-[haspopup]:translate-y-0",
          active && "bg-zinc-100 hover:bg-zinc-100 dark:bg-muted dark:hover:bg-muted",
        )}
      >
        <PresenceAvatar size="lg" name={conversation.contactName} initials={initials(conversation.contactName, conversation.contactEmail)} src={conversation.contactAvatar} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className={cn("flex-1 truncate text-sm", unread ? "font-semibold" : "font-medium")}>{conversation.subject}</span>
            <span className="shrink-0 text-xs font-normal text-muted-foreground">{formatRelativeTime(conversation.updatedAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <p className={cn("line-clamp-1 flex-1 text-xs font-normal", unread ? "text-foreground" : "text-muted-foreground")}>
              {lastMessage?.body || "No messages yet"}
            </p>
            {unread ? <Badge className="h-4 min-w-4 px-1 tabular-nums">{conversation.unreadCount}</Badge> : null}
          </div>
        </div>
      </Button>
    </li>
  );
}
