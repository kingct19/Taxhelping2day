"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { readSaved, writeSaved } from "@/hooks/use-saved-state";
import { useRouter } from "next/navigation";
import { ConversationList } from "@/components/inbox/conversation-list";
import { ConversationView } from "@/components/inbox/conversation-view";
import { DetailsPanel } from "@/components/inbox/details-panel";
import { InboxSidebar } from "@/components/inbox/inbox-sidebar";
import { inboxReducer, initialInboxState, latestForProfile, type InboxDeskData } from "@/components/inbox/inbox-state";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-query";
import { markConversationRead, updateConversation } from "@/lib/actions";
import { compareConversations, filterLabel, inboxFolderIds, inboxViewIds, matchesInboxFilter, matchesSearch, sortOptions, type InboxFilter, type SortOption } from "@/lib/inbox-view";
import { isTeamInbox, type ConversationPatch } from "@/lib/types";
import { cn } from "@/lib/utils";

type InboxChrome = {
  filter: InboxFilter;
  sort: SortOption;
  search: string;
  sidebarOpen: boolean;
  detailsOpen: boolean;
};

function isInboxChrome(value: unknown): value is InboxChrome {
  if (!value || typeof value !== "object") return false;
  const item = value as InboxChrome;
  if (typeof item.search !== "string" || typeof item.sidebarOpen !== "boolean" || typeof item.detailsOpen !== "boolean") return false;
  if (typeof item.sort !== "string" || !sortOptions.some((option) => option === item.sort)) return false;
  const filter = item.filter;
  if (!filter || typeof filter !== "object") return false;
  if (filter.type === "folder") return inboxFolderIds.some((id) => id === filter.id);
  if (filter.type === "view") return inboxViewIds.some((id) => id === filter.id);
  if (filter.type === "team") return typeof filter.id === "string" && isTeamInbox(filter.id);
  return false;
}

export function InboxView({ data }: { data: InboxDeskData }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(inboxReducer, data, initialInboxState);
  const [sidebarSheet, setSidebarSheet] = useState(false);
  const [detailsSheet, setDetailsSheet] = useState(false);
  const [chromeReady, setChromeReady] = useState(false);
  const sidebarIsColumn = useMediaQuery("(min-width: 1024px)");
  const detailsIsColumn = useMediaQuery("(min-width: 1280px)");
  const dataRef = useRef(data);
  dataRef.current = data;
  const stamp = data.conversations
    .map((conversation) =>
      [
        conversation.id,
        conversation.updatedAt,
        conversation.messages.length,
        conversation.unreadCount,
        conversation.status,
        conversation.priority,
        conversation.assigneeId,
        conversation.teamInbox,
        conversation.starred,
        conversation.isSpam,
        conversation.tags.join(","),
      ].join(":"),
    )
    .join("|");
  const appliedProfile = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const saved = readSaved("view:inbox", isInboxChrome);
    if (saved) {
      dispatch({ type: "filter", filter: saved.filter });
      dispatch({ type: "sort", sort: saved.sort });
      dispatch({ type: "search", search: saved.search });
      dispatch({ type: "sidebar", open: saved.sidebarOpen });
      dispatch({ type: "details", open: saved.detailsOpen });
    }
    setChromeReady(true);
  }, []);

  useEffect(() => {
    if (!chromeReady) return;
    writeSaved("view:inbox", {
      filter: state.filter,
      sort: state.sort,
      search: state.search,
      sidebarOpen: state.sidebarOpen,
      detailsOpen: state.detailsOpen,
    });
  }, [chromeReady, state.detailsOpen, state.filter, state.search, state.sidebarOpen, state.sort]);

  useEffect(() => {
    dispatch({ type: "sync", conversations: dataRef.current.conversations });
  }, [stamp]);

  useEffect(() => {
    if (appliedProfile.current === data.selectedProfileId) return;
    appliedProfile.current = data.selectedProfileId;
    if (!data.selectedProfileId) return;
    const match = latestForProfile(dataRef.current.conversations, data.selectedProfileId);
    if (match) dispatch({ type: "select", id: match.id });
  }, [data.selectedProfileId, stamp]);

  useEffect(() => {
    if (state.selectedId) void markConversationRead(state.selectedId);
  }, [state.selectedId]);

  const selected = state.conversations.find((conversation) => conversation.id === state.selectedId) ?? null;
  const visible = state.conversations
    .filter((conversation) =>
      matchesInboxFilter(conversation, state.filter, data.currentUserId) &&
      matchesSearch(
        [conversation.subject, conversation.contactName, conversation.contactEmail, conversation.messages.at(-1)?.body ?? ""],
        state.search,
      ),
    )
    .sort((left, right) => compareConversations(state.sort, left, right));
  const taskHref = selected ? `/tasks?client=${selected.profileId}` : "/tasks";

  function toggleSidebar() {
    if (sidebarIsColumn) dispatch({ type: "sidebar", open: !state.sidebarOpen });
    else setSidebarSheet((open) => !open);
  }

  function toggleDetails() {
    if (detailsIsColumn) dispatch({ type: "details", open: !state.detailsOpen });
    else setDetailsSheet((open) => !open);
  }

  function patch(id: string, next: ConversationPatch) {
    dispatch({ type: "patch", id, patch: next });
    void updateConversation(id, next);
  }

  function created(profileId: string) {
    router.push(`/inbox?id=${profileId}`);
  }

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 w-full overflow-hidden">
        <div className={cn("hidden min-h-0 shrink-0 overflow-hidden transition-[width] duration-300 ease-out lg:block", state.sidebarOpen ? "lg:w-64" : "lg:w-0")}>
          <InboxSidebar
            conversations={state.conversations}
            userId={data.currentUserId}
            filter={state.filter}
            contacts={data.contacts}
            onFilter={(filter) => {
              dispatch({ type: "filter", filter });
              setSidebarSheet(false);
            }}
            onCreated={created}
          />
        </div>
        {!sidebarIsColumn ? (
          <Sheet open={sidebarSheet} onOpenChange={setSidebarSheet}>
            <SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
              <SheetTitle className="sr-only">Inbox folders</SheetTitle>
              <InboxSidebar
                conversations={state.conversations}
                userId={data.currentUserId}
                filter={state.filter}
                contacts={data.contacts}
                onFilter={(filter) => {
                  dispatch({ type: "filter", filter });
                  setSidebarSheet(false);
                }}
                onCreated={created}
              />
            </SheetContent>
          </Sheet>
        ) : null}
        <div className={cn("flex min-h-0 w-full shrink-0 flex-col md:w-80 xl:w-[22rem]", selected && "max-md:hidden")}>
          <ConversationList
            title={filterLabel(state.filter)}
            conversations={visible}
            selectedId={state.selectedId}
            search={state.search}
            sort={state.sort}
            onSearch={(search) => dispatch({ type: "search", search })}
            onSort={(sort) => dispatch({ type: "sort", sort })}
            onSelect={(id) => dispatch({ type: "select", id })}
            onToggleSidebar={toggleSidebar}
          />
        </div>
        <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", !selected && "max-md:hidden")}>
          <ConversationView
            conversation={selected}
            currentUserId={data.currentUserId}
            teammates={data.teammates}
            taskHref={taskHref}
            onBack={() => dispatch({ type: "select", id: null })}
            onToggleDetails={toggleDetails}
            onPatch={(next) => { if (selected) patch(selected.id, next); }}
          />
        </div>
        <div className={cn("hidden min-h-0 shrink-0 overflow-hidden transition-[width] duration-300 ease-out xl:flex xl:justify-end", state.detailsOpen && selected ? "xl:w-80" : "xl:w-0")}>
          <DetailsPanel conversation={selected} teammates={data.teammates} firmName={data.firmName} taskHref={taskHref} catalogTags={data.catalogTags} onPatch={(next) => { if (selected) patch(selected.id, next); }} />
        </div>
        {!detailsIsColumn ? (
          <Sheet open={detailsSheet && Boolean(selected)} onOpenChange={setDetailsSheet}>
            <SheetContent side="right" className="w-80 p-0" showCloseButton={false}>
              <SheetTitle className="sr-only">Conversation details</SheetTitle>
              <DetailsPanel conversation={selected} teammates={data.teammates} firmName={data.firmName} taskHref={taskHref} catalogTags={data.catalogTags} onPatch={(next) => { if (selected) patch(selected.id, next); }} />
            </SheetContent>
          </Sheet>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
