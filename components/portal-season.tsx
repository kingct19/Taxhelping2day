import { DocumentRequests } from "@/components/document-requests";
import Link from "next/link";
import { postMessage } from "@/lib/actions";
import { clientNext } from "@/lib/next-action";
import { requestThreads } from "@/lib/request-thread";
import { seasonFor, seasonLabel, seasonStages } from "@/lib/season";
import { getStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

export async function PortalSeason({ profileId, readOnly = false }: { profileId: string; readOnly?: boolean }) {
  const store = getStore();
  const profile = await store.getProfile(profileId);
  if (!profile) return null;
  const [documents, signatures, messages, returns, filings, authorizations] = await Promise.all([
    store.listDocuments(profile.id),
    store.listSignatures(profile.id),
    store.listMessages(profile.id),
    store.listReturns(profile.id),
    store.listFilings(),
    store.listAuthorizations(),
  ]);
  const stage = seasonFor(profile, signatures, documents);
  const ranked = (returns.length ? returns : [null]).map((item) => ({
    item,
    next: clientNext({
      profile,
      signatures,
      documents,
      threads: requestThreads(messages.filter((message) => !item || message.returnId === item.id)),
      filings: filings.filter((filing) => filing.returnId === item?.id),
      authorizations: authorizations.filter((authorization) => authorization.returnId === item?.id),
      returnVersion: item?.returnVersion ?? 1,
    }),
  })).sort((a, b) => a.next.urgency - b.next.urgency);
  const next = ranked[0].next;
  const current = ranked[0].item;
  const stepIndex = seasonStages.indexOf(stage);

  return (
    <>
      <section className="flex flex-col gap-4 rounded-md border border-border bg-white p-6">
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">This season{current ? ` · ${current.entity} ${current.taxYear}` : ""}</p>
        {next.href && ["/portal/profile", "/portal/engagement", "/portal/documents"].includes(next.href) && stepIndex >= 0 && <p className="text-sm text-muted-foreground">Step {stepIndex + 1} of {seasonStages.length} · {seasonLabel(stage)}</p>}
        <h1 className="font-serif text-3xl">{next.headline}</h1>
        <p className="max-w-xl text-muted-foreground">{next.detail}</p>
        {next.action && next.href && (
          readOnly ? <Button className="w-fit" disabled>{next.action}</Button> : <Button nativeButton={false} className="w-fit" render={<Link href={next.href} />}>{next.action}</Button>
        )}
      </section>
      <DocumentRequests messages={messages} readOnly={readOnly} />
      <details id={readOnly ? undefined : "message"} className="rounded-md border border-border bg-white px-4 py-3">
        <summary className="cursor-pointer font-medium">Message the firm</summary>
        <div className="mt-4 flex flex-col gap-4">
          <ul className="flex flex-col gap-2 text-sm">
            {messages.filter((message) => message.kind !== "note").length === 0 ? (
              <li className="text-muted-foreground">No messages yet.</li>
            ) : (
              messages.filter((message) => message.kind !== "note").map((message) => (
                <li key={message.id}>
                  <span className="text-muted-foreground">{message.kind === "event" ? "Update" : message.authorRole}: </span>
                  {message.body}
                </li>
              ))
            )}
          </ul>
          {!readOnly && (
            <form action={postMessage} className="flex flex-col gap-3">
              <Field>
                <FieldLabel htmlFor="body">Note</FieldLabel>
                <Textarea id="body" name="body" rows={3} />
              </Field>
              <Button type="submit">Send</Button>
            </form>
          )}
        </div>
      </details>
    </>
  );
}
