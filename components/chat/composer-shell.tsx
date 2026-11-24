"use client";

import type { KeyboardEvent, ReactNode, RefObject } from "react";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type ComposerMode = "reply" | "note";

export function ComposerShell({
  value,
  onValueChange,
  mode,
  onModeChange,
  onSend,
  canSend,
  pending = false,
  replyLabel = "Send",
  noteLabel = "Add note",
  textareaRef,
  toolbar,
  above,
  attachments,
}: {
  value: string;
  onValueChange: (value: string) => void;
  mode: ComposerMode;
  onModeChange: (mode: ComposerMode) => void;
  onSend: () => void;
  canSend: boolean;
  pending?: boolean;
  replyLabel?: string;
  noteLabel?: string;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  toolbar?: ReactNode;
  above?: ReactNode;
  attachments?: ReactNode;
}) {
  const note = mode === "note";

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <div className="flex shrink-0 flex-col gap-2 p-4">
      {above}
      <div
        className={cn(
          "rounded-xl border transition-colors focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/30",
          note && "border-amber-400/50 bg-amber-50/60 focus-within:border-amber-400/30 focus-within:ring-amber-400/30 dark:bg-amber-500/5",
        )}
      >
        <Tabs value={mode} onValueChange={(next) => onModeChange(next === "note" ? "note" : "reply")} className="px-2 pt-2">
          <TabsList>
            <TabsTrigger value="reply">Reply</TabsTrigger>
            <TabsTrigger value="note">Note</TabsTrigger>
          </TabsList>
        </Tabs>
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={note ? "Add an internal note. The client does not see this." : "Write a reply…"}
          className="max-h-40 min-h-16 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 md:min-h-20 dark:bg-transparent"
        />
        {attachments}
        <div className="flex items-center justify-between gap-2 p-2">
          <div className="flex items-center gap-0.5">{toolbar}</div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-muted-foreground sm:inline">⌘+↵ to send</span>
            <Button type="button" size="lg" onClick={onSend} disabled={!canSend || pending} aria-busy={pending || undefined}>
              {pending ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
              {note ? noteLabel : replyLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
