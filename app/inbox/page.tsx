import Link from "next/link";
import { AlarmClockIcon, AlarmClockOffIcon, ChevronLeftIcon, StarIcon } from "lucide-react";
import { setFileFlags } from "@/lib/actions";
import { requireProfile } from "@/lib/auth";
import { ClientList } from "@/components/inbox/client-list";
import { FileDetails } from "@/components/inbox/file-details";
import { InboxEmpty } from "@/components/inbox/inbox-empty";
import { InboxSidebar } from "@/components/inbox/inbox-sidebar";
import { ReplyComposer } from "@/components/inbox/reply-composer";
import { ThreadMessage } from "@/components/inbox/thread-message";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { inboxHref, isInboxFolder, isSnoozed, matchesInboxFolder, type InboxRow } from "@/lib/inbox-view";
import { seasonFor, seasonLabel } from "@/lib/season";
import { getStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ id?: string; folder?: string }> }) {
  await requireProfile("staff");
  const { id, folder: folderQuery } = await searchParams;
  const folder = folderQuery && isInboxFolder(folderQuery) ? folderQuery : "all";
  const store = getStore();
  const profiles = await store.listProfiles();
  const clients = profiles.filter((profile) => profile.role === "client");
  const files = await Promise.all(
    clients.map(async (client) => {
      const [documents, signatures, identity] = await Promise.all([
        store.listDocuments(client.id),
        store.listSignatures(client.id),
        store.getIdentity(client.id),
      ]);
      return { client, documents, signatures, identity, stage: seasonFor(client, signatures, documents) };
    }),
  );
  const rows: InboxRow[] = files.map((file) => ({
    id: file.client.id,
    name: file.client.name,
    email: file.client.email,
    taxpayerType: file.client.taxpayerType,
    stage: file.stage,
    createdAt: file.client.createdAt,
    poaSigned: file.signatures.some((item) => item.kind === "poa"),
    identityChecked: Boolean(file.identity?.attested),
    starred: file.client.starred,
    snoozedUntil: file.client.snoozedUntil,
  }));
  const visible = rows.filter((row) => matchesInboxFolder(row, folder));
  const selectedFile = id ? (files.find((file) => file.client.id === id) ?? null) : null;
  const selected = selectedFile?.client ?? null;
  const documents = selectedFile?.documents ?? [];
  const signatures = selectedFile?.signatures ?? [];
  const identity = selectedFile?.identity ?? null;
  const messages = selected ? await store.listMessages(selected.id) : [];

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-background">
      <div className="hidden h-full lg:block">
        <InboxSidebar rows={rows} active={folder} />
      </div>
      <ClientList rows={visible} selectedId={selected?.id ?? null} folder={folder} className={selected ? "max-md:hidden" : undefined} />
      <div className={cn("flex min-h-0 min-w-0 flex-1", !selected && "max-md:hidden")}>
        {selected && selectedFile ? (
          <>
            <section className="flex min-w-0 flex-1 flex-col">
              <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                <Link href={inboxHref(folder)} aria-label="Back to files" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}>
                  <ChevronLeftIcon />
                </Link>
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">
                    {(selected.name || selected.email)
                      .split(/[\s@]+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() ?? "")
                      .join("") || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h1 className="truncate text-sm leading-tight font-semibold">{selected.name || selected.email}</h1>
                  <p className="truncate text-xs leading-tight text-muted-foreground">
                    {seasonLabel(selectedFile.stage)}
                    {isSnoozed(selected) ? " · Snoozed" : ""}
                  </p>
                </div>
                <TooltipProvider>
                  <div className="ml-auto flex items-center gap-1">
                    <form action={setFileFlags}>
                      <input type="hidden" name="clientId" value={selected.id} />
                      <input type="hidden" name="flag" value="star" />
                      <Tooltip>
                        <TooltipTrigger render={<Button type="submit" variant="ghost" size="icon" aria-label={selected.starred ? "Unstar" : "Star"} />}>
                          <StarIcon className={selected.starred ? "fill-primary text-primary" : undefined} />
                        </TooltipTrigger>
                        <TooltipContent>{selected.starred ? "Unstar" : "Star"}</TooltipContent>
                      </Tooltip>
                    </form>
                    <form action={setFileFlags}>
                      <input type="hidden" name="clientId" value={selected.id} />
                      <input type="hidden" name="flag" value="snooze" />
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button type="submit" variant="ghost" size="icon" aria-label={isSnoozed(selected) ? "Unsnooze" : "Snooze"} />
                          }
                        >
                          {isSnoozed(selected) ? <AlarmClockOffIcon /> : <AlarmClockIcon />}
                        </TooltipTrigger>
                        <TooltipContent>{isSnoozed(selected) ? "Unsnooze" : "Snooze for a day"}</TooltipContent>
                      </Tooltip>
                    </form>
                  </div>
                </TooltipProvider>
              </div>
              <ul className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
                {messages.length === 0 ? (
                  <li className="text-sm text-muted-foreground">No messages on this file yet.</li>
                ) : (
                  messages.map((message) => (
                    <li key={message.id}>
                      <ThreadMessage message={message} clientName={selected.name || selected.email} />
                    </li>
                  ))
                )}
              </ul>
              <ReplyComposer clientId={selected.id} />
            </section>
            <FileDetails client={selected} stage={selectedFile.stage} documents={documents} signatures={signatures} identity={identity} />
          </>
        ) : (
          <InboxEmpty />
        )}
      </div>
    </div>
  );
}
