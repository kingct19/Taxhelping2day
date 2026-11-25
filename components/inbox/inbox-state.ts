import type { StaffStatus } from "@/lib/teammates";
import type { Conversation, ConversationPatch, Message } from "@/lib/types";
import type { InboxFilter, SortOption } from "@/lib/inbox-view";

export type InboxFile = {
  id: string;
  name: string;
  url: string;
  size: string;
  kind: "image" | "file";
};

export type InboxPerson = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  staffStatus: StaffStatus;
};

export type InboxContact = InboxPerson & {
  phone: string;
  location: string;
};

export type InboxTaskLink = {
  id: string;
  profileId: string;
};

export type InboxConversation = Conversation & {
  contactName: string;
  contactEmail: string;
  contactAvatar: string | null;
  contactPhone: string;
  contactLocation: string;
  messages: Message[];
  files: InboxFile[];
};

export type InboxDeskData = {
  currentUserId: string;
  firmName: string;
  selectedProfileId: string | null;
  teammates: InboxPerson[];
  contacts: InboxContact[];
  tasks: InboxTaskLink[];
  conversations: InboxConversation[];
  catalogTags: string[];
};

export type InboxState = {
  conversations: InboxConversation[];
  filter: InboxFilter;
  sort: SortOption;
  search: string;
  selectedId: string | null;
  sidebarOpen: boolean;
  detailsOpen: boolean;
};

export type InboxAction =
  | { type: "sync"; conversations: InboxConversation[] }
  | { type: "filter"; filter: InboxFilter }
  | { type: "sort"; sort: SortOption }
  | { type: "search"; search: string }
  | { type: "select"; id: string | null }
  | { type: "sidebar"; open: boolean }
  | { type: "details"; open: boolean }
  | { type: "patch"; id: string; patch: ConversationPatch };

function markRead(conversation: InboxConversation): InboxConversation {
  return {
    ...conversation,
    unreadCount: 0,
    messages: conversation.messages.map((message) =>
      message.authorRole === "client" && message.kind === "message" ? { ...message, delivery: "seen" } : message,
    ),
  };
}

export function initialInboxState(data: InboxDeskData): InboxState {
  const selected = data.selectedProfileId
    ? data.conversations
        .filter((conversation) => conversation.profileId === data.selectedProfileId)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]
    : undefined;
  return {
    conversations: data.conversations,
    filter: { type: "folder", id: "all" },
    sort: "latest",
    search: "",
    selectedId: selected?.id ?? null,
    sidebarOpen: true,
    detailsOpen: true,
  };
}

export function inboxReducer(state: InboxState, action: InboxAction): InboxState {
  switch (action.type) {
    case "sync":
      return {
        ...state,
        conversations: action.conversations,
        selectedId: state.selectedId && action.conversations.some((conversation) => conversation.id === state.selectedId) ? state.selectedId : null,
      };
    case "filter":
      return { ...state, filter: action.filter };
    case "sort":
      return { ...state, sort: action.sort };
    case "search":
      return { ...state, search: action.search };
    case "select":
      return {
        ...state,
        selectedId: action.id,
        conversations: state.conversations.map((conversation) => (conversation.id === action.id ? markRead(conversation) : conversation)),
      };
    case "sidebar":
      return { ...state, sidebarOpen: action.open };
    case "details":
      return { ...state, detailsOpen: action.open };
    case "patch":
      return {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.id ? { ...conversation, ...action.patch, updatedAt: new Date().toISOString() } : conversation,
        ),
      };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export function latestForProfile(conversations: InboxConversation[], profileId: string) {
  return conversations
    .filter((conversation) => conversation.profileId === profileId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}
