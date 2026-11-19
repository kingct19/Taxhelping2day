import { FileIcon } from "lucide-react";
import { PresenceAvatar } from "@/components/inbox/presence-avatar";
import type { Message, MessageAttachment, MessageDelivery } from "@/lib/types";
import { initials } from "@/lib/inbox-view";
import { cn } from "@/lib/utils";

const deliveryLabel: Record<MessageDelivery, string> = {
  sent: "Sent",
  seen: "Seen",
  "not-seen": "Not seen",
};

function Attachments({ attachments, own }: { attachments: MessageAttachment[]; own: boolean }) {
  const images = attachments.filter((item) => item.type === "image");
  const files = attachments.filter((item) => item.type === "file");
  return (
    <div className={cn("flex flex-col gap-2", own ? "items-end self-end" : "items-start self-start")}>
      {images.map((image) => (
        <a key={image.id} href={image.url} target="_blank" rel="noopener noreferrer" className="block w-fit overflow-hidden rounded-xl border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt={image.name} className="max-h-64 max-w-72 object-cover" />
        </a>
      ))}
      {files.map((file) => (
        <a key={file.id} href={file.url} className="flex w-64 items-center gap-3 rounded-xl border bg-card px-3 py-2.5 hover:bg-muted/50">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <FileIcon className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium">{file.name}</span>
            <span className="block text-[11px] text-muted-foreground">{file.size}</span>
          </span>
        </a>
      ))}
    </div>
  );
}

export function MessageBubble({ message, authorName }: { message: Message; authorName: string }) {
  if (message.kind === "event") {
    return <p className="text-center text-xs text-muted-foreground">{message.body}</p>;
  }
  const own = message.authorRole === "staff" && message.kind === "message";
  const note = message.kind === "note";
  const when = new Date(message.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const suffix = message.delivery ? deliveryLabel[message.delivery] : "";
  const attachments = message.attachments ?? [];

  return (
    <div className={cn("flex items-end gap-2", own || (note && message.authorRole === "staff") ? "flex-row-reverse" : "flex-row")}>
      <PresenceAvatar name={authorName} initials={initials(authorName, authorName)} />
      <div className={cn("flex max-w-[85%] flex-col gap-1", own || (note && message.authorRole === "staff") ? "items-end" : "items-start")}>
        {attachments.length > 0 ? <Attachments attachments={attachments} own={own || message.authorRole === "staff"} /> : null}
        {note ? (
          <div className="w-fit rounded-xl border border-amber-400/40 bg-amber-50 px-3 py-2 dark:bg-amber-500/10">
            <p className="text-xs font-medium">
              {authorName} <span className="text-muted-foreground">· Internal note</span>
            </p>
            <p className="mt-1 text-sm whitespace-pre-wrap">{message.body}</p>
          </div>
        ) : (
          <div className={cn("w-fit rounded-2xl px-3.5 py-2.5 text-sm", own ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted")}>
            <p className="whitespace-pre-wrap">{message.body}</p>
          </div>
        )}
        <p className="px-1 text-[11px] text-muted-foreground">
          {when}
          {suffix ? ` · ${suffix}` : ""}
        </p>
      </div>
    </div>
  );
}
