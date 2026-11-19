"use client";

import { useState } from "react";
import { SendIcon } from "lucide-react";
import { postMessage } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ComposerMode = "reply" | "note";

export function ReplyComposer({ clientId }: { clientId: string }) {
  const [mode, setMode] = useState<ComposerMode>("reply");
  const note = mode === "note";

  return (
    <div className="flex shrink-0 flex-col gap-2 p-4">
      <div
        className={cn(
          "rounded-xl border transition-colors focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/30",
          note && "border-amber-400/50 bg-amber-50/60 focus-within:border-amber-400/30 focus-within:ring-amber-400/30 dark:bg-amber-500/5",
        )}
      >
        <div className="flex gap-1 px-2 pt-2">
          <Button type="button" size="sm" variant={note ? "ghost" : "secondary"} onClick={() => setMode("reply")}>
            Reply
          </Button>
          <Button type="button" size="sm" variant={note ? "secondary" : "ghost"} onClick={() => setMode("note")}>
            Note
          </Button>
        </div>
        <form action={postMessage}>
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="kind" value={note ? "note" : "message"} />
          <Textarea
            name="body"
            required
            rows={3}
            placeholder={note ? "Only the practice sees this note." : "Write a reply…"}
            className="max-h-40 min-h-16 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 md:min-h-20 dark:bg-transparent"
          />
          <div className="flex items-center justify-end gap-2 p-2">
            <span className="text-[11px] text-muted-foreground">{note ? "Hidden from the client" : "Sends to the client file"}</span>
            <Button type="submit" size="lg">
              <SendIcon />
              {note ? "Add note" : "Reply"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
