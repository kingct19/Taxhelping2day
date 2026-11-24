"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileIcon, PaperclipIcon, SearchIcon, SmileIcon, XIcon } from "lucide-react";
import { ComposerShell } from "@/components/chat/composer-shell";
import { PresenceAvatar } from "@/components/inbox/presence-avatar";
import { MessageBubble } from "@/components/inbox/message-bubble";
import { LiniqoArt, liniqo } from "@/components/liniqo-empty";
import { postMessage } from "@/lib/actions";
import { formatBytes, formatRelativeTime, initials } from "@/lib/inbox-view";
import type { Message } from "@/lib/types";
import { Attachment, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from "@/components/ui/attachment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const maxBytes = 15 * 1024 * 1024;
const emojis = ["😀", "😂", "😊", "👍", "🙏", "✅", "👋", "🎉"];
const suggestions = ["I uploaded the file you asked for.", "Can you take a look at this?", "When is this ready to sign?"];

function ClientComposer() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

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
    const tooLarge = files.find((file) => file.size > maxBytes);
    if (tooLarge) {
      setError("Each file must be 15 MB or smaller.");
      return;
    }
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("body", value);
    for (const file of files) formData.append("files", file);
    try {
      await postMessage(formData);
      setValue("");
      setFiles([]);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The message did not send.");
    } finally {
      setPending(false);
    }
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
          <div className="grid grid-cols-4 gap-1">
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
    </>
  );

  return (
    <>
      <ComposerShell
        value={value}
        onValueChange={setValue}
        mode="reply"
        onModeChange={() => undefined}
        onSend={() => void send()}
        canSend={value.trim().length > 0 || files.length > 0}
        pending={pending}
        allowNote={false}
        textareaRef={textareaRef}
        above={above}
        attachments={attachments}
        toolbar={toolbar}
      />
      {error ? <p role="alert" className="px-4 pb-3 text-sm text-destructive">{error}</p> : null}
      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        aria-label="Attach files"
        multiple
        accept="image/*,.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt,.zip"
        onChange={(event) => {
          const picked = Array.from(event.target.files ?? []);
          setFiles((current) => [...current, ...picked].slice(0, 8));
          event.target.value = "";
        }}
      />
    </>
  );
}

export function ClientInbox({
  preparerName,
  preparerEmail,
  preparerAvatar,
  firmName,
  selfName,
  selfAvatar,
  messages,
  unread,
}: {
  preparerName: string;
  preparerEmail: string;
  preparerAvatar: string | null;
  firmName: string;
  selfName: string;
  selfAvatar: string | null;
  messages: Message[];
  unread: number;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const last = messages.at(-1);
  const query = search.trim().toLowerCase();
  const visible = query
    ? messages.filter((message) => message.body.toLowerCase().includes(query) || preparerName.toLowerCase().includes(query))
    : messages;
  const listMatches = !query || preparerName.toLowerCase().includes(query) || (last?.body.toLowerCase().includes(query) ?? false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <TooltipProvider>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="hidden h-full min-h-0 w-80 shrink-0 flex-col border-r bg-sidebar md:flex xl:w-[22rem]">
          <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <h2 className="truncate text-base font-semibold">Messages</h2>
            <span className="text-sm text-muted-foreground tabular-nums">1</span>
          </div>
          <div className="border-b p-3">
            <InputGroup className="h-8 bg-transparent">
              <InputGroupAddon>
                <SearchIcon className="size-4" />
              </InputGroupAddon>
              <InputGroupInput placeholder="Search conversations" value={search} onChange={(event) => setSearch(event.target.value)} />
            </InputGroup>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {listMatches ? (
              <ul className="flex flex-col gap-1 p-3">
                <li>
                  <div className="flex w-full items-start gap-3 rounded-lg bg-zinc-100 px-2.5 py-2.5 dark:bg-muted">
                    <PresenceAvatar size="lg" name={preparerName} initials={initials(preparerName, preparerEmail)} src={preparerAvatar} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className={cn("flex-1 truncate text-sm", unread > 0 ? "font-semibold" : "font-medium")}>{preparerName}</span>
                        {last ? <span className="shrink-0 text-xs font-normal text-muted-foreground">{formatRelativeTime(last.createdAt)}</span> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={cn("line-clamp-1 flex-1 text-xs font-normal", unread > 0 ? "text-foreground" : "text-muted-foreground")}>
                          {last?.body || "No messages yet"}
                        </p>
                        {unread > 0 ? <Badge className="h-4 min-w-4 px-1 tabular-nums">{unread > 9 ? "9+" : unread}</Badge> : null}
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No conversations match.</p>
            )}
          </ScrollArea>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
          <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <PresenceAvatar name={preparerName} initials={initials(preparerName, preparerEmail)} src={preparerAvatar} />
            <div className="min-w-0">
              <h2 className="truncate text-sm leading-tight font-semibold">{preparerName}</h2>
              <p className="truncate text-xs leading-tight text-muted-foreground">{firmName}</p>
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {messages.length === 0 ? (
              <div className="flex min-h-full flex-col items-center justify-center gap-3 p-8 text-center">
                <LiniqoArt {...liniqo.liveChat} className="size-36" />
                <div className="flex flex-col items-center gap-1.5">
                  <p className="text-2xl font-semibold">No messages yet</p>
                  <p className="max-w-sm text-sm text-balance text-muted-foreground">Write when you have a question. {preparerName} sees it in the firm inbox.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 p-4">
                {visible.length === 0 ? <p className="text-center text-sm text-muted-foreground">No messages match that search.</p> : null}
                {visible.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    viewer="client"
                    authorName={message.authorRole === "client" ? selfName : preparerName}
                    authorAvatar={message.authorRole === "client" ? selfAvatar : preparerAvatar}
                  />
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </ScrollArea>
          <ClientComposer />
        </div>
      </div>
    </TooltipProvider>
  );
}
