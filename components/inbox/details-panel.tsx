"use client";

import { useState, type ReactNode } from "react";
import { useSavedState } from "@/hooks/use-saved-state";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, FileIcon, LinkIcon, SendHorizontalIcon, SparklesIcon, XIcon } from "lucide-react";
import { PresenceAvatar } from "@/components/inbox/presence-avatar";
import { LiniqoEmpty, liniqo } from "@/components/liniqo-empty";
import type { InboxConversation, InboxFile, InboxPerson } from "@/components/inbox/inbox-state";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { channelLabel, copilotPrompts, initials, priorityLabel, statusLabel, teamInboxLabel } from "@/lib/inbox-view";
import { conversationPriorities, conversationStatuses, teamInboxIds, type ConversationPatch, type ConversationPriority, type ConversationStatus } from "@/lib/types";

function Attr({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="max-w-[60%] truncate text-xs font-medium" title={value}>{value}</span>
    </div>
  );
}

function ManageRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="w-44">{children}</div>
    </div>
  );
}

function DetailsSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="space-y-2">
      <CollapsibleTrigger
        render={
          <Button type="button" variant="ghost" size="sm" className="group/section h-7 w-full justify-between bg-transparent px-1">
            <span className="text-sm font-medium">{title}</span>
            <ChevronDownIcon className="size-4 transition-transform group-aria-expanded/section:rotate-180" />
          </Button>
        }
      />
      <CollapsibleContent className="space-y-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function Choice({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string;
  items: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <ManageRow label={label}>
      <Select items={items} value={value} onValueChange={(next) => { if (next) onChange(next); }}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </ManageRow>
  );
}

function isPriority(value: string): value is ConversationPriority {
  return conversationPriorities.some((item) => item === value);
}

function isStatus(value: string): value is ConversationStatus {
  return conversationStatuses.some((item) => item === value);
}

export function DetailsPanel({
  conversation,
  teammates,
  firmName,
  taskHref,
  catalogTags = [],
  onPatch,
}: {
  conversation: InboxConversation | null;
  teammates: InboxPerson[];
  firmName: string;
  taskHref: string;
  catalogTags?: string[];
  onPatch: (patch: ConversationPatch) => void;
}) {
  const router = useRouter();
  const [panel, setPanel] = useSavedState<"details" | "copilot">("view:inbox-details-tab", "details", (value): value is "details" | "copilot" => value === "details" || value === "copilot");
  const [tag, setTag] = useState("");
  const [ask, setAsk] = useState("");
  if (!conversation) return null;

  const assigneeItems = [
    { label: "Unassigned", value: "unassigned" },
    ...teammates.filter((person) => person.staffStatus === "active").map((person) => ({ label: person.name || person.email, value: person.id })),
  ];
  const teamItems = [
    { label: "No team inbox", value: "none" },
    ...teamInboxIds.map((team) => ({ label: teamInboxLabel(team), value: team })),
  ];
  const priorityItems = conversationPriorities.map((priority) => ({ label: priorityLabel(priority), value: priority }));
  const statusItems = conversationStatuses.map((status) => ({ label: statusLabel(status), value: status }));
  const shared = new Map<string, InboxFile>();
  for (const file of conversation.files) shared.set(file.url, file);
  for (const message of conversation.messages) {
    for (const attachment of message.attachments ?? []) {
      shared.set(attachment.url, {
        id: attachment.id,
        name: attachment.name,
        url: attachment.url,
        size: attachment.size,
        kind: attachment.type,
      });
    }
  }
  const files = [...shared.values()];

  function openAssistant(prompt: string) {
    const text = `${prompt}\n\nConversation: ${conversation?.subject ?? ""}`;
    router.push(`/assistant?prompt=${encodeURIComponent(text)}`);
  }

  function addTag() {
    const next = tag.trim();
    if (!next || conversation?.tags.includes(next)) return;
    onPatch({ tags: [...(conversation?.tags ?? []), next] });
    setTag("");
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l bg-sidebar">
      <Tabs
        value={panel}
        onValueChange={(value) => {
          if (value === "details" || value === "copilot") setPanel(value);
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex h-14 shrink-0 items-center border-b px-3">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="copilot">Copilot</TabsTrigger>
          </TabsList>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <TabsContent value="details" className="m-0 space-y-4 p-4">
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <PresenceAvatar size="lg" name={conversation.contactName} initials={initials(conversation.contactName, conversation.contactEmail)} src={conversation.contactAvatar} />
              <div>
                <p className="text-sm font-semibold">{conversation.contactName || "Client"}</p>
                <p className="text-xs text-muted-foreground">{conversation.contactEmail}</p>
              </div>
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/contacts/${conversation.profileId}`} />}>
                View contact
              </Button>
            </div>
            <Separator />
            <div className="space-y-3">
              <Choice
                label="Assignee"
                value={conversation.assigneeId ?? "unassigned"}
                items={assigneeItems}
                onChange={(value) => onPatch({ assigneeId: value === "unassigned" ? null : value })}
              />
              <Choice
                label="Team inbox"
                value={conversation.teamInbox ?? "none"}
                items={teamItems}
                onChange={(value) => onPatch({ teamInbox: value === "prep" || value === "review" || value === "client-care" ? value : null })}
              />
              <Choice
                label="Priority"
                value={conversation.priority}
                items={priorityItems}
                onChange={(value) => { if (isPriority(value)) onPatch({ priority: value }); }}
              />
              <Choice
                label="Status"
                value={conversation.status}
                items={statusItems}
                onChange={(value) => { if (isStatus(value)) onPatch({ status: value }); }}
              />
              <Button type="button" variant={conversation.isSpam ? "secondary" : "outline"} size="lg" className="w-full" onClick={() => onPatch({ isSpam: !conversation.isSpam })}>
                {conversation.isSpam ? "Remove from spam" : "Mark as spam"}
              </Button>
            </div>
            <Separator />
            <DetailsSection title="Lead data" defaultOpen>
              <Attr label="Name" value={conversation.contactName || "—"} />
              <Attr label="Email" value={conversation.contactEmail || "—"} />
              <Attr label="Phone" value={conversation.contactPhone || "—"} />
              <Attr label="Location" value={conversation.contactLocation || "—"} />
            </DetailsSection>
            <Separator />
            <DetailsSection title="Conversation attributes" defaultOpen>
              <Attr label="ID" value={conversation.id} />
              <Attr label="Channel" value={channelLabel(conversation.channel)} />
              <Attr label="Brand" value={firmName} />
            </DetailsSection>
            <Separator />
            <DetailsSection title="Tags" defaultOpen>
              <div className="flex flex-wrap gap-1 px-1">
                {conversation.tags.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {item}
                    <button type="button" aria-label={`Remove ${item}`} onClick={() => onPatch({ tags: conversation.tags.filter((tag) => tag !== item) })}>
                      <XIcon className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
              <form
                className="flex gap-1 px-1"
                onSubmit={(event) => {
                  event.preventDefault();
                  addTag();
                }}
              >
                <Input value={tag} onChange={(event) => setTag(event.target.value)} placeholder="Add a tag" className="h-8" list="catalog-tags" />
                <datalist id="catalog-tags">
                  {catalogTags.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
                <Button type="submit" variant="outline" size="sm">Add</Button>
              </form>
              {catalogTags.some((item) => !conversation.tags.includes(item)) ? (
                <div className="flex flex-wrap gap-1 px-1">
                  {catalogTags.filter((item) => !conversation.tags.includes(item)).map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => onPatch({ tags: [...conversation.tags, item] })}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : null}
            </DetailsSection>
            <Separator />
            <DetailsSection title="Links">
              <Link href={`/contacts/${conversation.profileId}`} className="flex items-center gap-2 rounded-md px-1 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                <LinkIcon className="size-3.5" />
                Contact
              </Link>
              <Link href={taskHref} className="flex items-center gap-2 rounded-md px-1 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                <LinkIcon className="size-3.5" />
                Tasks
              </Link>
            </DetailsSection>
            <Separator />
            <DetailsSection title={files.length > 0 ? `Shared files (${files.length})` : "Shared files"} defaultOpen>
              {files.length === 0 ? (
                <LiniqoEmpty {...liniqo.sharedFolder} className="px-1 py-3" artClassName="size-20">No files shared yet</LiniqoEmpty>
              ) : (
                files.map((file) => (
                  <a key={file.id} href={file.url} className="flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted">
                    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                      {file.kind === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={file.url} alt="" className="size-full object-cover" />
                      ) : (
                        <FileIcon className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium">{file.name}</span>
                      <span className="block text-[10px] text-muted-foreground">{file.size}</span>
                    </span>
                  </a>
                ))
              )}
            </DetailsSection>
          </TabsContent>
          <TabsContent value="copilot" className="m-0 flex flex-col justify-between gap-4 p-4">
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <SparklesIcon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">AI Copilot</p>
                <p className="text-xs text-muted-foreground">Ask anything about this conversation.</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="space-y-1.5">
                <p className="px-1 text-xs font-medium text-muted-foreground">Suggested</p>
                {copilotPrompts.map((prompt) => (
                  <Button key={prompt} type="button" variant="outline" className="h-auto w-full justify-start gap-2 py-2 text-left font-normal whitespace-normal" onClick={() => openAssistant(prompt)}>
                    <SparklesIcon className="size-4 shrink-0 text-muted-foreground" />
                    {prompt}
                  </Button>
                ))}
              </div>
              <form
                className="flex items-center gap-1 rounded-lg border p-1 focus-within:ring-2 focus-within:ring-ring/30"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (ask.trim()) openAssistant(ask.trim());
                }}
              >
                <Input value={ask} onChange={(event) => setAsk(event.target.value)} placeholder="Ask Copilot…" className="h-8 border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent" />
                <Button type="submit" size="icon" aria-label="Ask Copilot">
                  <SendHorizontalIcon />
                </Button>
              </form>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  );
}
