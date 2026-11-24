import { randomUUID } from "crypto";
import { defaultSuggestions } from "@/lib/inbox-view";
import {
  isConversationChannel,
  isConversationPriority,
  isConversationStatus,
  isMessageDelivery,
  isTeamInbox,
  type Conversation,
  type ConversationChannel,
  type Message,
  type MessageAttachment,
  type MessageDelivery,
  type Profile,
} from "@/lib/types";

export function parseAttachments(value: unknown): MessageAttachment[] {
  const list = Array.isArray(value) ? value : [];
  return list.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? "");
    if (!id) return [];
    return [
      {
        id,
        name: String(row.name ?? "File"),
        size: String(row.size ?? ""),
        type: row.type === "image" ? "image" : "file",
        documentId: row.documentId ? String(row.documentId) : null,
        url: String(row.url ?? ""),
      },
    ];
  });
}

export function parseDelivery(value: unknown): MessageDelivery | null {
  return typeof value === "string" && isMessageDelivery(value) ? value : null;
}

export function normalizeConversation(row: Partial<Conversation> & Pick<Conversation, "id" | "profileId">): Conversation {
  const createdAt = row.createdAt ?? new Date().toISOString();
  return {
    id: row.id,
    profileId: row.profileId,
    subject: row.subject?.trim() || "Conversation",
    channel: row.channel && isConversationChannel(row.channel) ? row.channel : "chat",
    status: row.status && isConversationStatus(row.status) ? row.status : "open",
    priority: row.priority && isConversationPriority(row.priority) ? row.priority : "none",
    assigneeId: row.assigneeId ?? null,
    teamInbox: row.teamInbox && isTeamInbox(row.teamInbox) ? row.teamInbox : null,
    tags: Array.isArray(row.tags) ? row.tags.filter((tag) => typeof tag === "string" && tag.trim()) : [],
    unreadCount: typeof row.unreadCount === "number" ? row.unreadCount : 0,
    starred: Boolean(row.starred),
    mentioned: Boolean(row.mentioned),
    createdByMe: Boolean(row.createdByMe),
    isSpam: Boolean(row.isSpam),
    suggestions: row.suggestions && row.suggestions.length > 0 ? row.suggestions : defaultSuggestions,
    createdAt,
    updatedAt: row.updatedAt ?? createdAt,
  };
}

export function blankConversation(profile: Pick<Profile, "id" | "name" | "email" | "starred" | "snoozedUntil">, extras?: {
  subject?: string;
  channel?: ConversationChannel;
  assigneeId?: string | null;
  createdByMe?: boolean;
}): Conversation {
  const now = new Date().toISOString();
  const snoozed = profile.snoozedUntil !== null && new Date(profile.snoozedUntil).getTime() > Date.now();
  return normalizeConversation({
    id: randomUUID(),
    profileId: profile.id,
    subject: extras?.subject?.trim() || profile.name || profile.email,
    channel: extras?.channel ?? "chat",
    status: snoozed ? "snoozed" : "open",
    priority: "none",
    assigneeId: extras?.assigneeId ?? null,
    teamInbox: null,
    tags: [],
    unreadCount: 0,
    starred: profile.starred,
    mentioned: false,
    createdByMe: extras?.createdByMe ?? false,
    isSpam: false,
    suggestions: defaultSuggestions,
    createdAt: now,
    updatedAt: now,
  });
}

export function conversationFromSupabase(row: Record<string, unknown>): Conversation {
  const channel = String(row.channel ?? "");
  const status = String(row.status ?? "");
  const priority = String(row.priority ?? "");
  const team = row.team_inbox == null ? null : String(row.team_inbox);
  return normalizeConversation({
    id: String(row.id),
    profileId: String(row.profile_id),
    subject: String(row.subject ?? ""),
    channel: isConversationChannel(channel) ? channel : "chat",
    status: isConversationStatus(status) ? status : "open",
    priority: isConversationPriority(priority) ? priority : "none",
    assigneeId: row.assignee_id ? String(row.assignee_id) : null,
    teamInbox: team && isTeamInbox(team) ? team : null,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    unreadCount: Number(row.unread_count ?? 0),
    starred: Boolean(row.starred),
    mentioned: Boolean(row.mentioned),
    createdByMe: Boolean(row.created_by_me),
    isSpam: Boolean(row.is_spam),
    suggestions: Array.isArray(row.suggestions) ? row.suggestions.map(String) : [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  });
}

export function normalizeMessage(row: Message): Pick<Message, "conversationId" | "delivery" | "attachments"> {
  return {
    conversationId: row.conversationId ?? null,
    delivery: parseDelivery(row.delivery),
    attachments: parseAttachments(row.attachments),
  };
}
