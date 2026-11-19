import type { Conversation, ConversationPriority, TeamInboxId } from "@/lib/types";

export const inboxFolderIds = ["you", "mentions", "created", "all", "unassigned", "spam"] as const;
export type InboxFolderId = (typeof inboxFolderIds)[number];

export const inboxViewIds = ["starred", "priority", "snoozed"] as const;
export type InboxViewId = (typeof inboxViewIds)[number];

export const sortOptions = ["latest", "oldest", "priority", "unread"] as const;
export type SortOption = (typeof sortOptions)[number];

export type InboxFilter =
  | { type: "folder"; id: InboxFolderId }
  | { type: "view"; id: InboxViewId }
  | { type: "team"; id: TeamInboxId };

export type SavedReply = { id: string; title: string; body: string };

export const defaultSuggestions = [
  "Could you send the documents still open on this file?",
  "I will review this and write back shortly.",
];

export const savedReplies: SavedReply[] = [
  { id: "greeting", title: "Greeting", body: "Hi — thanks for writing. I am looking at your file now." },
  {
    id: "documents",
    title: "Ask for documents",
    body: "Could you send the documents still open on this file? A photo or a PDF is fine.",
  },
  {
    id: "closing",
    title: "Closing",
    body: "Thanks. I will close this for now — reply here if you need anything else.",
  },
];

export const copilotPrompts = [
  "Summarize this conversation",
  "Draft a reply",
  "What is the client asking for?",
];

const priorityRank: Record<ConversationPriority, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

export function inboxFolderLabel(folder: InboxFolderId): string {
  switch (folder) {
    case "you":
      return "Your inbox";
    case "mentions":
      return "Mentions";
    case "created":
      return "Created by you";
    case "all":
      return "All";
    case "unassigned":
      return "Unassigned";
    case "spam":
      return "Spam";
    default: {
      const exhaustive: never = folder;
      return exhaustive;
    }
  }
}

export function inboxViewLabel(view: InboxViewId): string {
  switch (view) {
    case "starred":
      return "Starred";
    case "priority":
      return "High priority";
    case "snoozed":
      return "Snoozed";
    default: {
      const exhaustive: never = view;
      return exhaustive;
    }
  }
}

export function teamInboxLabel(team: TeamInboxId): string {
  switch (team) {
    case "prep":
      return "Prep";
    case "review":
      return "Review";
    case "client-care":
      return "Client care";
    default: {
      const exhaustive: never = team;
      return exhaustive;
    }
  }
}

export function sortLabel(sort: SortOption): string {
  switch (sort) {
    case "latest":
      return "Last activity";
    case "oldest":
      return "Oldest first";
    case "priority":
      return "Priority";
    case "unread":
      return "Unread first";
    default: {
      const exhaustive: never = sort;
      return exhaustive;
    }
  }
}

export function channelLabel(channel: Conversation["channel"]): string {
  switch (channel) {
    case "chat":
      return "Chat";
    case "email":
      return "Email";
    case "phone":
      return "Phone";
    default: {
      const exhaustive: never = channel;
      return exhaustive;
    }
  }
}

export function statusLabel(status: Conversation["status"]): string {
  switch (status) {
    case "open":
      return "Open";
    case "snoozed":
      return "Snoozed";
    case "closed":
      return "Closed";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function priorityLabel(priority: ConversationPriority): string {
  switch (priority) {
    case "none":
      return "None";
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    case "urgent":
      return "Urgent";
    default: {
      const exhaustive: never = priority;
      return exhaustive;
    }
  }
}

export function filterLabel(filter: InboxFilter): string {
  switch (filter.type) {
    case "folder":
      return inboxFolderLabel(filter.id);
    case "view":
      return inboxViewLabel(filter.id);
    case "team":
      return teamInboxLabel(filter.id);
    default: {
      const exhaustive: never = filter;
      return exhaustive;
    }
  }
}

function matchesFolder(conversation: Conversation, folder: InboxFolderId, userId: string): boolean {
  switch (folder) {
    case "you":
      return conversation.assigneeId === userId && !conversation.isSpam;
    case "mentions":
      return conversation.mentioned && !conversation.isSpam;
    case "created":
      return conversation.createdByMe && !conversation.isSpam;
    case "unassigned":
      return conversation.assigneeId === null && !conversation.isSpam;
    case "spam":
      return conversation.isSpam;
    case "all":
      return !conversation.isSpam;
    default: {
      const exhaustive: never = folder;
      return exhaustive;
    }
  }
}

function matchesView(conversation: Conversation, view: InboxViewId): boolean {
  if (conversation.isSpam) return false;
  switch (view) {
    case "starred":
      return conversation.starred;
    case "priority":
      return conversation.priority === "high" || conversation.priority === "urgent";
    case "snoozed":
      return conversation.status === "snoozed";
    default: {
      const exhaustive: never = view;
      return exhaustive;
    }
  }
}

export function matchesInboxFilter(conversation: Conversation, filter: InboxFilter, userId: string): boolean {
  switch (filter.type) {
    case "folder":
      return matchesFolder(conversation, filter.id, userId);
    case "view":
      return matchesView(conversation, filter.id);
    case "team":
      return conversation.teamInbox === filter.id && !conversation.isSpam;
    default: {
      const exhaustive: never = filter;
      return exhaustive;
    }
  }
}

export function countFolder(conversations: Conversation[], folder: InboxFolderId, userId: string) {
  return conversations.filter((conversation) => matchesFolder(conversation, folder, userId)).length;
}

export function countView(conversations: Conversation[], view: InboxViewId) {
  return conversations.filter((conversation) => matchesView(conversation, view)).length;
}

export function countTeam(conversations: Conversation[], team: TeamInboxId) {
  return conversations.filter((conversation) => conversation.teamInbox === team && !conversation.isSpam).length;
}

export function matchesSearch(parts: string[], search: string) {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return parts.join(" ").toLowerCase().includes(needle);
}

export function compareConversations(sort: SortOption, left: Conversation, right: Conversation) {
  switch (sort) {
    case "latest":
      return right.updatedAt.localeCompare(left.updatedAt);
    case "oldest":
      return left.updatedAt.localeCompare(right.updatedAt);
    case "priority":
      return priorityRank[right.priority] - priorityRank[left.priority] || right.updatedAt.localeCompare(left.updatedAt);
    case "unread":
      return right.unreadCount - left.unreadCount || right.updatedAt.localeCompare(left.updatedAt);
    default: {
      const exhaustive: never = sort;
      return exhaustive;
    }
  }
}

export function initials(name: string, email: string) {
  const source = name.trim() || email;
  const parts = source.split(/[\s@]+/).filter(Boolean).slice(0, 2);
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return letters || "?";
}

export function formatRelativeTime(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (Number.isNaN(delta) || delta < minute) return "now";
  if (delta < hour) return `${Math.floor(delta / minute)}m`;
  if (delta < day) return `${Math.floor(delta / hour)}h`;
  return `${Math.floor(delta / day)}d`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sameFilter(left: InboxFilter, right: InboxFilter) {
  return left.type === right.type && left.id === right.id;
}
