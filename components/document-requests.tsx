import { advanceRequest, remindRequest } from "@/lib/actions";
import { clientOwes, requestBlockLabel, requestLabel, requestThreads, staffOwes } from "@/lib/request-thread";
import { requestTone } from "@/lib/status-tone";
import type { Message } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DocumentRequests({ messages, staff = false, readOnly = false }: { messages: Message[]; staff?: boolean; readOnly?: boolean }) {
  const threads = requestThreads(messages).filter((thread) => {
    const state = thread.latest.requestState;
    if (!state) return false;
    if (!staff) return clientOwes(state);
    return state !== "accepted" && state !== "waived";
  });
  if (!threads.length) return null;
  return (
    <section className="grid gap-3">
      <h2 className={staff ? "text-sm font-medium" : "font-serif text-2xl"}>{staff ? "From the customer" : "What we still need"}</h2>
      {staff ? <p className="-mt-1 text-sm text-muted-foreground">Accept what they sent, send it back, or waive it.</p> : null}
      {threads.map(({ root, latest }) => {
        const state = latest.requestState;
        if (!state) return null;
        const submit = advanceRequest.bind(null, root.profileId, latest.id);
        return (
          <article key={root.id} id={`request-${root.id}`} className="grid gap-3 rounded-md border bg-card p-4">
            <div>
              <p className="font-medium">{root.body}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant={requestTone(state)}>{requestLabel(state, staff)}</Badge>
                {root.requestBlock ? requestBlockLabel(root.requestBlock) : null}
              </p>
              {latest.id !== root.id && <p className="mt-2 text-sm">{latest.body}</p>}
            </div>
            {latest.documentId && <a className="text-sm underline" href={`/files/documents/${latest.documentId}`}>Open the uploaded file</a>}
            {!staff && clientOwes(state) && (
              <div className="grid gap-3">
                <form action={readOnly ? undefined : submit} className="grid gap-2">
                  <Input aria-label="Requested file (up to 15 MB)" type="file" name="file" required disabled={readOnly} />
                  <Button className="w-fit" disabled={readOnly}>Upload for review</Button>
                </form>
                <form action={readOnly ? undefined : submit} className="grid gap-2">
                  <Input name="reason" required maxLength={1000} aria-label="Why you cannot send it" placeholder="Not issued, or when you can send it" disabled={readOnly} />
                  <Button className="w-fit" variant="outline" name="decision" value="unavailable" disabled={readOnly}>I don&apos;t have this</Button>
                </form>
              </div>
            )}
            {staff && clientOwes(state) && process.env.RESEND_API_KEY && process.env.EMAIL_FROM && (
              <form action={remindRequest.bind(null, root.profileId, latest.id)}><Button variant="outline">Email reminder</Button></form>
            )}
            {staff && staffOwes(state) && (
              <div className="grid gap-2">
                <form action={submit}><Button name="decision" value="accepted">Accept</Button></form>
                <form action={submit} className="flex flex-wrap gap-2">
                  <Input name="reason" required maxLength={1000} aria-label="What needs correcting" placeholder="What needs correcting?" />
                  <Button variant="outline" name="decision" value="replacement">Send back</Button>
                </form>
                <form action={submit} className="flex flex-wrap gap-2">
                  <Input name="reason" required maxLength={1000} aria-label="Why this can be waived" placeholder="Why this can be waived" />
                  <Button variant="outline" name="decision" value="waived">Waive</Button>
                </form>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
