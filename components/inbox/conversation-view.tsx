"use client";

import { useEffect, useRef } from "react";
import { ConversationHeader } from "@/components/inbox/conversation-header";
import { InboxEmpty } from "@/components/inbox/inbox-empty";
import { MessageBubble } from "@/components/inbox/message-bubble";
import { ReplyComposer } from "@/components/inbox/reply-composer";
import type { InboxConversation, InboxPerson } from "@/components/inbox/inbox-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ConversationPatch } from "@/lib/types";

export function ConversationView({
  conversation,
  currentUserId,
  teammates,
  taskHref,
  onBack,
  onToggleDetails,
  onPatch,
}: {
  conversation: InboxConversation | null;
  currentUserId: string;
  teammates: InboxPerson[];
  taskHref: string;
  onBack: () => void;
  onToggleDetails: () => void;
  onPatch: (patch: ConversationPatch) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const count = conversation?.messages.length ?? 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [conversation?.id, count]);

  if (!conversation) return <InboxEmpty />;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ConversationHeader
        conversation={conversation}
        currentUserId={currentUserId}
        taskHref={taskHref}
        onBack={onBack}
        onToggleDetails={onToggleDetails}
        onPatch={onPatch}
      />
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 p-4">
          {conversation.messages.map((message) => {
            const teammate = teammates.find((person) => person.id === message.authorId);
            const authorName = message.authorRole === "client" ? conversation.contactName || conversation.contactEmail : teammate?.name || teammate?.email || "Staff";
            return <MessageBubble key={message.id} message={message} authorName={authorName} />;
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <ReplyComposer key={conversation.id} conversationId={conversation.id} suggestions={conversation.suggestions} />
    </div>
  );
}
