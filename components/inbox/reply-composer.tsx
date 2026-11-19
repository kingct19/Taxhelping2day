"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileIcon, PaperclipIcon, SmileIcon, XIcon, ZapIcon } from "lucide-react";
import { ComposerShell, type ComposerMode } from "@/components/chat/composer-shell";
import { sendConversationMessage } from "@/lib/actions";
import { formatBytes, savedReplies } from "@/lib/inbox-view";
import { Attachment, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, useCommandQuery } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const emojis = ["😀", "😂", "😊", "😍", "👍", "🙏", "❤️", "🔥", "✅", "👋", "🎉", "🤔", "🙌", "✨", "👀"];

function SavedReplyList({ onPick }: { onPick: (body: string) => void }) {
  const query = useCommandQuery().trim().toLowerCase();
  const matches = savedReplies.filter((reply) => `${reply.title} ${reply.body}`.toLowerCase().includes(query));
  if (matches.length === 0) return <CommandEmpty>No saved replies found.</CommandEmpty>;
  return (
    <CommandGroup heading="Saved replies">
      {matches.map((reply) => (
        <CommandItem key={reply.id} className="flex-col items-start gap-0.5" onSelect={() => onPick(reply.body)}>
          <span className="text-sm font-medium">{reply.title}</span>
          <span className="line-clamp-1 text-xs text-muted-foreground">{reply.body}</span>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

export function ReplyComposer({ conversationId, suggestions }: { conversationId: string; suggestions: string[] }) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<ComposerMode>("reply");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);

  function insertText(text: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setValue((current) => current + text);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setValue((current) => `${current.slice(0, start)}${text}${current.slice(end)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + text.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  async function send() {
    if (pending || (!value.trim() && files.length === 0)) return;
    setPending(true);
    const formData = new FormData();
    formData.set("conversationId", conversationId);
    formData.set("body", value);
    formData.set("kind", mode === "note" ? "note" : "message");
    for (const file of files) formData.append("files", file);
    await sendConversationMessage(formData);
    setValue("");
    setFiles([]);
    setPending(false);
    router.refresh();
  }

  const above =
    suggestions.length > 0 && !value && files.length === 0 ? (
      <div className="hidden flex-wrap gap-1.5 md:flex">
        {suggestions.map((suggestion) => (
          <Button key={suggestion} type="button" variant="outline" size="sm" className="rounded-full font-normal text-muted-foreground" onClick={() => insertText(suggestion)}>
            {suggestion}
          </Button>
        ))}
      </div>
    ) : null;

  const attachments =
    files.length > 0 ? (
      <div className="flex flex-wrap gap-2 px-3 pb-2">
        {files.map((file, index) => (
          <Attachment key={`${file.name}-${index}`}>
            <AttachmentMedia>
              <FileIcon className="size-4" />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{file.name}</AttachmentTitle>
              <AttachmentDescription>{formatBytes(file.size)}</AttachmentDescription>
            </AttachmentContent>
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Remove attachment" onClick={() => setFiles((current) => current.filter((_, item) => item !== index))}>
              <XIcon />
            </Button>
          </Attachment>
        ))}
      </div>
    ) : null;

  const toolbar = (
    <>
      <Tooltip>
        <TooltipTrigger render={<Button type="button" variant="ghost" size="icon" aria-label="Attach file" onClick={() => fileRef.current?.click()} />}>
          <PaperclipIcon />
        </TooltipTrigger>
        <TooltipContent>Attach file</TooltipContent>
      </Tooltip>
      <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger render={<Button type="button" variant="ghost" size="icon" aria-label="Insert emoji" />}>
                <SmileIcon />
              </PopoverTrigger>
            }
          />
          <TooltipContent>Emoji</TooltipContent>
        </Tooltip>
        <PopoverContent align="start" className="w-64 p-2">
          <div className="grid grid-cols-5 gap-1">
            {emojis.map((emoji) => (
              <Button
                key={emoji}
                type="button"
                variant="ghost"
                size="icon"
                className="text-lg"
                aria-label={emoji}
                onClick={() => {
                  insertText(emoji);
                  setEmojiOpen(false);
                }}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <Popover open={repliesOpen} onOpenChange={setRepliesOpen}>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger render={<Button type="button" variant="ghost" size="icon" aria-label="Saved replies" />}>
                <ZapIcon />
              </PopoverTrigger>
            }
          />
          <TooltipContent>Saved replies</TooltipContent>
        </Tooltip>
        <PopoverContent align="start" className="w-80 p-0">
          <Command>
            <CommandInput placeholder="Search saved replies…" />
            <CommandList>
              <SavedReplyList
                onPick={(body) => {
                  insertText(body);
                  setRepliesOpen(false);
                }}
              />
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );

  return (
    <>
      <ComposerShell
        value={value}
        onValueChange={setValue}
        mode={mode}
        onModeChange={setMode}
        onSend={() => void send()}
        canSend={value.trim().length > 0 || files.length > 0}
        pending={pending}
        textareaRef={textareaRef}
        above={above}
        attachments={attachments}
        toolbar={toolbar}
      />
      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        aria-label="Attach files"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt,.zip"
        onChange={(event) => {
          const picked = Array.from(event.target.files ?? []);
          setFiles((current) => [...current, ...picked].slice(0, 8));
          event.target.value = "";
        }}
      />
    </>
  );
}
