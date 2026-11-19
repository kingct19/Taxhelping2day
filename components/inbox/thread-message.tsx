import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Message, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name.split(/[\s@]+/).filter(Boolean).slice(0, 2);
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return letters || "?";
}

function authorLabel(role: Role, kind: Message["kind"], clientName: string) {
  switch (kind) {
    case "note":
      return "Note";
    case "event":
      return "Update";
    case "message":
      return role === "staff" ? "Staff" : clientName || "Client";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function ThreadMessage({ message, clientName }: { message: Message; clientName: string }) {
  const own = message.authorRole === "staff" && message.kind === "message";
  if (message.kind === "event") {
    return <p className="text-center text-xs text-muted-foreground">{message.body}</p>;
  }
  const label = authorLabel(message.authorRole, message.kind, clientName);
  const when = new Date(message.createdAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className={cn("flex items-end gap-2", own ? "flex-row-reverse" : "flex-row")}>
      <Avatar className="size-8">
        <AvatarFallback className="text-xs">{initials(label)}</AvatarFallback>
      </Avatar>
      <div className={cn("flex max-w-[80%] flex-col gap-1", own ? "items-end" : "items-start")}>
        {message.kind === "note" ? (
          <div className="w-fit rounded-xl border border-amber-400/40 bg-amber-50 px-3 py-2 dark:bg-amber-500/10">
            <p className="text-xs font-medium">
              {label} <span className="text-muted-foreground">· Practice only</span>
            </p>
            <p className="mt-1 text-sm whitespace-pre-wrap">{message.body}</p>
          </div>
        ) : (
          <div
            className={cn(
              "w-fit rounded-2xl px-3.5 py-2.5 text-sm",
              own ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted",
            )}
          >
            <p className="whitespace-pre-wrap">{message.body}</p>
          </div>
        )}
        <p className="px-1 text-[11px] text-muted-foreground">{when}</p>
      </div>
    </div>
  );
}
