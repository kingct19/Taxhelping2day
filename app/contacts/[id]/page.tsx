import { IdentityForm } from "@/components/identity-form";
import { TaxReturnList } from "@/components/tax-return-list";
import { createTaxReturn } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireProfile } from "@/lib/auth";
import { seasonFor, seasonLabel } from "@/lib/season";
import { getStore } from "@/lib/store";
import { documentKindLabel, taskTitle, taxpayerTypeLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="max-w-[65%] truncate text-right text-sm">{value || "Not on file"}</span>
    </div>
  );
}

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  await requireProfile("staff");
  const { id } = await params;
  const store = getStore();
  const client = await store.getProfile(id);
  if (!client || client.role !== "client") {
    notFound();
  }
  const [documents, signatures, messages, identity, tasks, returns] = await Promise.all([
    store.listDocuments(client.id),
    store.listSignatures(client.id),
    store.listMessages(client.id),
    store.getIdentity(client.id),
    store.listTasks(),
    store.listReturns(id),
  ]);
  const stage = seasonFor(client, signatures, documents);
  const fileTasks = tasks.filter((task) => task.profileId === client.id);
  const visibleMessages = messages.filter((message) => message.kind !== "note");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <Link href="/contacts" aria-label="Back to contacts" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ChevronLeftIcon />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold">{client.name || client.email}</h1>
          <p className="truncate text-xs text-muted-foreground">{client.email}</p>
        </div>
        <Link href={`/inbox?id=${client.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ml-auto")}>
          Open conversation
        </Link>
      </div>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[18rem_minmax(0,1fr)_20rem]">
        <aside className="flex flex-col gap-3 overflow-auto border-b p-4 lg:border-r lg:border-b-0">
          <h2 className="text-sm font-medium">Profile</h2>
          <Fact label="Phone" value={client.phone} />
          <Fact label="Taxpayer" value={taxpayerTypeLabel(client.taxpayerType)} />
          <Fact label="Address" value={[client.address, client.city, client.state, client.zip].filter(Boolean).join(", ")} />
          <Fact label="Spouse" value={client.spouseName} />
          <Fact label="Tax years" value={client.taxYears} />
          <Fact label="Taxpayer ID" value={client.taxIdLast4 ? `Ending ${client.taxIdLast4}` : ""} />
        </aside>
        <section className="flex min-h-0 flex-col gap-3 overflow-auto p-4">
          <TaxReturnList returns={returns} />
          <details className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">Open a tax return</summary>
            <form action={createTaxReturn.bind(null, id)} className="mt-3 grid gap-3 text-sm">
              <label>Taxpayer or entity name<Input name="entity" maxLength={150} required /></label>
              <label>Tax year<Input name="year" type="number" min={1900} max={9999} required /></label>
              <label>Return type
                <select name="type" className="block rounded-md border p-2" defaultValue={client.taxpayerType}>
                  <option value="individual">Individual</option>
                  <option value="business">Business</option>
                  <option value="nonprofit">Nonprofit</option>
                </select>
              </label>
              <Button type="submit" className="w-fit">Open return</Button>
            </form>
          </details>
          <h2 className="text-sm font-medium">Activity</h2>
          {visibleMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages on this file yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {visibleMessages.map((message) => (
                <li key={message.id} className="rounded-lg border px-3 py-2 text-sm">
                  <p className="text-xs text-muted-foreground">
                    {message.kind === "event" ? "Update" : message.authorRole} ·{" "}
                    {new Date(message.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside className="flex flex-col gap-4 overflow-auto border-t p-4 xl:border-t-0 xl:border-l">
          <h2 className="text-sm font-medium">This season</h2>
          <Fact label="Stage" value={seasonLabel(stage)} />
          <div className="flex flex-wrap gap-2">
            <Badge variant={signatures.some((item) => item.kind === "poa") ? "success" : "warning"}>
              {signatures.some((item) => item.kind === "poa") ? "Form 2848 signed" : "Form 2848 open"}
            </Badge>
            <Badge variant={identity?.attested ? "success" : "warning"}>{identity?.attested ? "Identity checked" : "Identity open"}</Badge>
          </div>
          <h2 className="text-sm font-medium">Documents</h2>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">None uploaded.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {documents.map((document) => (
                <li key={document.id}>
                  <a className="underline" href={`/files/documents/${document.id}`}>
                    {documentKindLabel(document.kind)}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <h2 className="text-sm font-medium">Identity</h2>
          <IdentityForm key={`${client.id}-${identity?.attested ?? false}-${identity?.note ?? ""}`} clientId={client.id} identity={identity} />
          <h2 className="text-sm font-medium">Tasks</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {fileTasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-2">
                <Link href={`/tasks?id=${task.id}`} className="underline">
                  {taskTitle(task.kind)}
                </Link>
                <span className="text-xs text-muted-foreground">{task.status === "done" ? "Done" : "Open"}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
