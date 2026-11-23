"use client";

import { ArrowDownWideNarrowIcon, PanelLeftIcon, SearchIcon } from "lucide-react";
import { ConversationListItem } from "@/components/inbox/conversation-list-item";
import { LiniqoEmpty, liniqo } from "@/components/liniqo-empty";
import type { InboxConversation } from "@/components/inbox/inbox-state";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { sortLabel, sortOptions, type SortOption } from "@/lib/inbox-view";

function isSort(value: string): value is SortOption {
  return sortOptions.some((option) => option === value);
}

export function ConversationList({
  title,
  conversations,
  selectedId,
  search,
  sort,
  onSearch,
  onSort,
  onSelect,
  onToggleSidebar,
}: {
  title: string;
  conversations: InboxConversation[];
  selectedId: string | null;
  search: string;
  sort: SortOption;
  onSearch: (value: string) => void;
  onSort: (value: SortOption) => void;
  onSelect: (id: string) => void;
  onToggleSidebar: () => void;
}) {
  const openCount = conversations.filter((conversation) => conversation.status === "open").length;

  return (
    <div className="flex h-full min-h-0 w-full flex-col border-r">
      <div className="flex h-14 shrink-0 items-center gap-1.5 border-b px-3">
        <Tooltip>
          <TooltipTrigger render={<Button type="button" variant="ghost" size="icon" aria-label="Toggle folders" onClick={onToggleSidebar} />}>
            <PanelLeftIcon />
          </TooltipTrigger>
          <TooltipContent>Toggle folders</TooltipContent>
        </Tooltip>
        <h2 className="truncate text-base font-semibold">{title}</h2>
        <span className="text-sm text-muted-foreground tabular-nums">{conversations.length}</span>
      </div>
      <div className="flex flex-col gap-2 border-b p-3">
        <InputGroup className="h-8 bg-transparent">
          <InputGroupAddon>
            <SearchIcon className="size-4" />
          </InputGroupAddon>
          <InputGroupInput placeholder="Search conversations" value={search} onChange={(event) => onSearch(event.target.value)} />
        </InputGroup>
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-muted-foreground tabular-nums">{openCount} Open</span>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="sm" className="gap-1 text-muted-foreground" />}>
              <ArrowDownWideNarrowIcon />
              {sortLabel(sort)}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={sort} onValueChange={(value) => { if (isSort(value)) onSort(value); }}>
                {sortOptions.map((option) => (
                  <DropdownMenuRadioItem key={option} value={option}>
                    {sortLabel(option)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {conversations.length === 0 ? (
          <LiniqoEmpty {...liniqo.mailSorter} className="px-4 py-6" artClassName="size-24">No conversations here.</LiniqoEmpty>
        ) : (
          <ul className="flex flex-col gap-1 p-3 pb-28 md:pb-3">
            {conversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                active={conversation.id === selectedId}
                onSelect={() => onSelect(conversation.id)}
              />
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
