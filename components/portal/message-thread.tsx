"use client";

import { useEffect, useRef } from "react";
import { LiniqoEmpty, liniqo } from "@/components/liniqo-empty";
import { shortDateTime } from "@/lib/return-progress";
import type { Message, MessageDelivery } from "@/lib/types";

function receiptLabel(delivery: MessageDelivery | null): string | null {
  switch (delivery) {
    case "seen":
      return "Seen";
    case "sent":
    case "not-seen":
      return "Sent";
    case null:
      return null;
    default: {
      const exhaustive: never = delivery;
      return exhaustive;
    }
  }
}

export function MessageThread({ messages }: { messages: Message[] }) {
  const end = useRef<HTMLLIElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <LiniqoEmpty id={liniqo.liveChat.id} title="No messages yet" artClassName="size-28">
        Write when you have a question. The firm sees it in their inbox.
      </LiniqoEmpty>
    );
  }

  return (
    <ol className="grid gap-3">
      {messages.map((message) => {
        const own = message.authorRole === "client";
        const receipt = own ? receiptLabel(message.delivery) : null;
        return (
          <li key={message.id} className={own ? "ml-8 grid justify-items-end gap-1" : "mr-8 grid gap-1"}>
            <p className="text-[11px] text-muted-foreground">
              {own ? "You" : "Tax team"} · {shortDateTime(message.createdAt)}
              {receipt ? ` · ${receipt}` : ""}
            </p>
            <div className={`w-fit max-w-full rounded-2xl px-3 py-2 text-sm ${own ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <p className="whitespace-pre-wrap">{message.body}</p>
            </div>
            {message.attachments.length > 0 ? (
              <ul className="grid gap-1">
                {message.attachments.map((file) => (
                  <li key={file.id}>
                    {file.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <a href={file.url}><img src={file.url} alt={file.name} className="max-h-32 rounded-md" /></a>
                    ) : (
                      <a className="text-sm underline" href={file.url}>{file.name}</a>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
      <li ref={end} className="h-px" aria-hidden="true" />
    </ol>
  );
}
