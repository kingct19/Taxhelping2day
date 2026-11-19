import { EfilePanel } from "@/components/efile-panel";
import { EngagementPacket } from "@/components/engagement-packet";
import { DocumentRequests } from "@/components/document-requests";
import { FilingLedger } from "@/components/filing-ledger";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireProfile } from "@/lib/auth";
import { recordIntakeReview, saveReturnWorkflow } from "@/lib/actions";
import { staffNext } from "@/lib/next-action";
import { requestThreads } from "@/lib/request-thread";
import { stages } from "@/lib/return-workflow";
import { stageTone } from "@/lib/status-tone";
import { getStore } from "@/lib/store";
import { taxpayerTypeLabel } from "@/lib/types";

const selectStyle = "h-8 w-full rounded-lg border bg-background px-2 text-sm";

export default async function ReviewPage({ params }: { params: Promise<{ profileId: string; returnId: string }> }) {
  await requireProfile("staff");
  const { profileId, returnId } = await params;
  const store = getStore();
  const [team, documents, signatures, messages, profiles, filings, authorizations] = await Promise.all([
    store.listTeamReturns(), store.listDocuments(profileId), store.listSignatures(profileId), store.listMessages(profileId), store.listProfiles(), store.listFilings(returnId), store.listAuthorizations(returnId),
  ]);
  const item = team.find((row) => row.id === returnId && row.profileId === profileId);
  if (!item) notFound();
  const authors = new Map(profiles.map(person => [person.id, person.name || person.email]));
  const client = profiles.find((person) => person.id === profileId);
  const activity = messages.filter(message => message.returnId === returnId).reverse();
  const reviewed = new Set(activity.flatMap(entry => [entry.documentId, entry.signatureId]));
  const threads = requestThreads(messages.filter(message => message.returnId === returnId));
  const next = staffNext({
    name: client?.name || client?.email || "the client",
    due: item.due,
    stage: item.stage,
    threads,
    filings,
    authorizations,
    returnVersion: item.returnVersion,
  });
  const files = [
    ...documents.filter(doc => !messages.some(row => row.documentId === doc.id && row.requestState && row.returnId !== returnId)).map(doc => ({
      id: doc.id,
      label: doc.filename,
      href: `/files/documents/${doc.id}`,
      contentType: doc.contentType,
    })),
    ...signatures.map(sig => ({
      id: sig.id,
      label: `${sig.kind === "poa" ? "Power of attorney" : "Engagement letter"} · signed ${sig.signedAt.slice(0, 10)}`,
      href: `/files/signatures/${sig.id}`,
      contentType: "application/pdf",
    })),
  ];
  const save = recordIntakeReview.bind(null, profileId, returnId);
  const clientName = client?.name || client?.email || "Unnamed customer";
  const owner = authors.get(item.owner ?? "") || "Unassigned";
  const due = item.due
    ? new Date(`${item.due}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  return (
    <main className="mx-auto grid w-full max-w-5xl content-start gap-8 overflow-auto px-6 py-6">
      <header className="grid gap-4">
        <Link href="/returns" className="text-sm text-muted-foreground underline">All returns</Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{clientName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.taxYear} {taxpayerTypeLabel(item.taxpayerType).toLowerCase()} return
              {client?.email ? ` · ${client.email}` : ""}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {owner}{due ? ` · Due ${due}` : " · No due date"}
              {" · "}
              <Link className="underline" href={`/contacts/${profileId}`}>Customer file</Link>
            </p>
          </div>
          <Badge variant={stageTone(item.stage)}>{stages[item.stage]}</Badge>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Do this next</p>
          <p className="mt-1 font-medium">{next.headline}</p>
          {next.detail ? <p className="mt-1 text-sm text-muted-foreground">{next.detail}</p> : null}
        </div>
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_20rem]">
        <div className="grid gap-8">
          <FilingLedger profileId={profileId} returnId={returnId} filings={filings} />
          <DocumentRequests messages={activity} staff />
          <section className="grid gap-3">
            <div>
              <h2 className="text-sm font-medium">Files on this return</h2>
              <p className="mt-1 text-sm text-muted-foreground">Mark a file reviewed after you have looked at it for this year.</p>
            </div>
            {files.length === 0 ? <p className="text-sm text-muted-foreground">No files yet.</p> : null}
            {files.map((file) => {
              const preview = `${file.href}?preview=1`;
              const image = file.contentType.startsWith("image/");
              const pdf = file.contentType === "application/pdf";
              return (
                <article key={file.id} className="overflow-hidden rounded-lg border">
                  {pdf ? (
                    <iframe title={file.label} src={preview} className="h-72 w-full bg-white" />
                  ) : image ? (
                    <img alt="" src={preview} className="max-h-72 w-full bg-white object-contain" />
                  ) : (
                    <p className="px-3 py-6 text-sm text-muted-foreground">This file type has no preview. Open it to read it.</p>
                  )}
                  <form action={save} className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-3">
                    <a href={file.href} className="text-sm underline">{file.label}</a>
                    <input type="hidden" name="file" value={file.id} />
                    {reviewed.has(file.id) ? (
                      <span className="text-sm text-muted-foreground">Reviewed</span>
                    ) : (
                      <Button name="action" value="accept" type="submit" variant="outline" size="sm">Mark reviewed</Button>
                    )}
                  </form>
                </article>
              );
            })}
          </section>
        </div>
        <aside className="grid content-start gap-6">
          <form action={save} className="grid gap-2 rounded-lg border p-4">
            <label htmlFor="request" className="text-sm font-medium">Ask the customer</label>
            <Textarea id="request" name="detail" required maxLength={1000} placeholder="Which document or correction do you need?" />
            <label className="grid gap-1 text-sm">
              How it affects the return
              <select className={selectStyle} name="block" defaultValue="filing">
                <option value="start">We cannot start without it</option>
                <option value="filing">We cannot file without it</option>
                <option value="info">For our notes only</option>
              </select>
            </label>
            <Button className="w-fit" type="submit" name="action" value="request" size="sm">Send to their portal</Button>
          </form>
          <form action={save} className="grid gap-2 rounded-lg border p-4">
            <label htmlFor="note" className="text-sm font-medium">Note for the team</label>
            <Textarea id="note" name="detail" required maxLength={1000} placeholder="What should the next preparer know?" />
            <Button className="w-fit" type="submit" name="action" value="note" variant="outline" size="sm">Save note</Button>
          </form>
          <EfilePanel mode="staff" profileId={profileId} returnId={returnId} returnVersion={item.returnVersion} authorizations={authorizations} />
          <EngagementPacket profileId={profileId} returnId={returnId} email={client?.email ?? ""} />
          <details className="rounded-lg border px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">History</summary>
            {activity.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nothing recorded yet.</p> : null}
            <ul className="mt-3 grid gap-3">
              {activity.map((entry) => (
                <li key={entry.id}>
                  <p className="text-xs text-muted-foreground">
                    {authors.get(entry.authorId) || "Team"}
                    {" · "}
                    {new Date(entry.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    {" · "}
                    {entry.kind === "note" ? "Team only" : "Customer can see this"}
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{entry.body}</p>
                </li>
              ))}
            </ul>
          </details>
          <details className="rounded-lg border px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">Assign this return</summary>
            <p className="mt-2 text-xs text-muted-foreground">Who is preparing it, and when it is due.</p>
            <form action={saveReturnWorkflow.bind(null, item.id, item.revision)} className="mt-3 grid gap-3 text-sm">
              <label className="grid gap-1">
                Where it stands
                <select className={selectStyle} name="stage" defaultValue={item.stage}>
                  {Object.entries(stages).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </label>
              <label className="grid gap-1">
                Preparer
                <select className={selectStyle} name="owner" defaultValue={item.owner ?? ""}>
                  <option value="">Unassigned</option>
                  {profiles.filter((person) => person.role === "staff").map((person) => (
                    <option key={person.id} value={person.id}>{authors.get(person.id)}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                Due date
                <Input type="date" name="due" defaultValue={item.due ?? ""} />
              </label>
              <label className="grid gap-1">
                Note for the team
                <Input name="nextAction" maxLength={500} defaultValue={item.nextAction} />
              </label>
              <Button className="w-fit" type="submit" variant="outline" size="sm">Save assignment</Button>
            </form>
          </details>
        </aside>
      </div>
    </main>
  );
}
