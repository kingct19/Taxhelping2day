"use client";

import { useRouter } from "next/navigation";
import {
  AlarmClockIcon,
  AlarmClockOffIcon,
  CheckIcon,
  ChevronLeftIcon,
  ListTodoIcon,
  MoreHorizontalIcon,
  PanelRightIcon,
  ShieldAlertIcon,
  StarIcon,
  UserIcon,
} from "lucide-react";
import { PresenceAvatar } from "@/components/inbox/presence-avatar";
import type { InboxConversation } from "@/components/inbox/inbox-state";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { initials } from "@/lib/inbox-view";
import type { ConversationPatch } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ConversationHeader({
  conversation,
  currentUserId,
  taskHref,
  onBack,
  onToggleDetails,
  onPatch,
}: {
  conversation: InboxConversation;
  currentUserId: string;
  taskHref: string;
  onBack: () => void;
  onToggleDetails: () => void;
  onPatch: (patch: ConversationPatch) => void;
}) {
  const router = useRouter();
  const closed = conversation.status === "closed";
  const snoozed = conversation.status === "snoozed";
  const mine = conversation.assigneeId === currentUserId;
  const subtitle = conversation.subject === conversation.contactName ? conversation.contactEmail : `${conversation.contactName} · ${conversation.contactEmail}`;

  function star() {
    onPatch({ starred: !conversation.starred });
  }
  function snooze() {
    onPatch({ status: snoozed ? "open" : "snoozed" });
  }
  function assign() {
    onPatch({ assigneeId: mine ? null : currentUserId });
  }
  function spam() {
    onPatch({ isSpam: !conversation.isSpam });
  }
  function close() {
    onPatch({ status: closed ? "open" : "closed" });
  }
  function openTasks() {
    router.push(taskHref);
  }

  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button type="button" variant="ghost" size="icon" className="md:hidden" aria-label="Back to conversations" onClick={onBack}>
          <ChevronLeftIcon />
        </Button>
        <PresenceAvatar name={conversation.contactName} initials={initials(conversation.contactName, conversation.contactEmail)} />
        <div className="min-w-0">
          <h2 className="truncate text-sm leading-tight font-semibold">{conversation.subject}</h2>
          <p className="truncate text-xs leading-tight text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="hidden items-center gap-1 md:flex">
        <Tooltip>
          <TooltipTrigger render={<Button type="button" variant="ghost" size="icon" aria-label="Star conversation" onClick={star} />}>
            <StarIcon className={cn(conversation.starred && "fill-yellow-400 text-yellow-400")} />
          </TooltipTrigger>
          <TooltipContent>{conversation.starred ? "Unstar" : "Star"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<Button type="button" variant="ghost" size="icon" aria-label={snoozed ? "Unsnooze conversation" : "Snooze conversation"} onClick={snooze} />}>
            {snoozed ? <AlarmClockOffIcon className="text-primary" /> : <AlarmClockIcon />}
          </TooltipTrigger>
          <TooltipContent>{snoozed ? "Unsnooze" : "Snooze"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<Button type="button" variant="ghost" size="icon" aria-label="Open tasks" onClick={openTasks} />}>
            <ListTodoIcon />
          </TooltipTrigger>
          <TooltipContent>Open tasks</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" aria-label="More actions" />}>
                  <MoreHorizontalIcon />
                </DropdownMenuTrigger>
              }
            />
            <TooltipContent>More actions</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuItem onClick={assign}>
              <UserIcon />
              {mine ? "Unassign" : "Assign to me"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant={conversation.isSpam ? "default" : "destructive"} onClick={spam}>
              <ShieldAlertIcon />
              {conversation.isSpam ? "Remove from spam" : "Mark as spam"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Tooltip>
          <TooltipTrigger render={<Button type="button" variant="ghost" size="icon" aria-label="Toggle details panel" onClick={onToggleDetails} />}>
            <PanelRightIcon />
          </TooltipTrigger>
          <TooltipContent>Toggle details</TooltipContent>
        </Tooltip>
        <Button type="button" variant={closed ? "secondary" : "destructive"} size="lg" onClick={close}>
          {closed ? "Reopen" : "Close"}
        </Button>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" className="md:hidden" aria-label="Conversation actions" />}>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={star}>
            <StarIcon className={cn(conversation.starred && "fill-yellow-400 text-yellow-400")} />
            {conversation.starred ? "Unstar" : "Star"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={snooze}>
            <AlarmClockIcon />
            {snoozed ? "Unsnooze" : "Snooze"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleDetails}>
            <PanelRightIcon />
            Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openTasks}>
            <ListTodoIcon />
            Open tasks
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={assign}>
            <UserIcon />
            {mine ? "Unassign" : "Assign to me"}
          </DropdownMenuItem>
          <DropdownMenuItem variant={conversation.isSpam ? "default" : "destructive"} onClick={spam}>
            <ShieldAlertIcon />
            {conversation.isSpam ? "Remove from spam" : "Mark as spam"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={close}>
            <CheckIcon />
            {closed ? "Reopen" : "Close"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
