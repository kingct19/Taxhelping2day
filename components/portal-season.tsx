import { DocumentRequests } from "@/components/document-requests";
import { LiniqoEmpty, liniqo } from "@/components/liniqo-empty";
import { OnboardingWizard } from "@/components/season-wizard";
import Link from "next/link";
import { postMessage } from "@/lib/actions";
import { clientNext } from "@/lib/next-action";
import { requestThreads } from "@/lib/request-thread";
import { engagementLetter, type LetterState } from "@/lib/engagement-letter";
import { emptyIntake } from "@/lib/filing-needs";
import { seasonFor, type SeasonStage } from "@/lib/season";
import { getStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

function onboardingStep(season: SeasonStage): "details" | "scope" | "letter" | "documents" | null {
  switch (season) {
    case "profile":
      return "details";
    case "scope":
      return "scope";
    case "documents":
      return "documents";
    case "letter":
      return "letter";
    case "ready":
      return null;
    default: {
      const exhaustive: never = season;
      return exhaustive;
    }
  }
}

function letterCopy(
  letter: LetterState | null,
  next: { headline: string; detail: string; action: string | null; href: string | null },
) {
  if (!letter) return next;
  switch (letter.status) {
    case "unsigned":
      return {
        headline: "The firm is reviewing your documents",
        detail: "After that review, the team sends the engagement letter. It will be ready to sign here.",
        action: null,
        href: null,
      };
    case "sent":
      return {
        headline: next.headline,
        detail: "The engagement letter was sent. Open it to review and sign.",
        action: letter.href ? "Review and sign" : next.action,
        href: letter.href ?? next.href,
      };
    case "opened":
      return {
        headline: next.headline,
        detail: "You opened the engagement letter. Sign it so preparation can start.",
        action: letter.href ? "Review and sign" : "Finish signing",
        href: letter.href ?? "/portal/signatures",
      };
    case "signed":
      return next;
    case "declined":
      return {
        headline: "The engagement letter was declined",
        detail: "Ask the firm to send a new copy.",
        action: null,
        href: null,
      };
    default: {
      const exhaustive: never = letter;
      return exhaustive;
    }
  }
}

export async function PortalSeason({ profileId, readOnly = false }: { profileId: string; readOnly?: boolean }) {
  const store = getStore();
  const profile = await store.getProfile(profileId);
  if (!profile) return null;
  const [documents, signatures, messages, returns, filings, authorizations, catalog] = await Promise.all([
    store.listDocuments(profile.id),
    store.listSignatures(profile.id),
    store.listMessages(profile.id),
    store.listTeamReturns(),
    store.listFilings(),
    store.listAuthorizations(),
    store.getFilingCatalog(),
  ]);
  const mine = returns.filter((item) => item.profileId === profile.id);
  const ranked = (mine.length ? mine : [null]).map((item) => ({
    item,
    next: clientNext({
      profile,
      signatures,
      documents,
      threads: requestThreads(messages.filter((message) => !item || message.returnId === item.id)),
      filings: filings.filter((filing) => filing.returnId === item?.id),
      authorizations: authorizations.filter((authorization) => authorization.returnId === item?.id),
      returnVersion: item?.returnVersion ?? 1,
      stage: item?.stage ?? null,
      intake: item ? { answered: item.desk.intakeAnswered, needs: item.desk.filingNeeds } : emptyIntake(),
      catalog,
    }),
  })).sort((a, b) => a.next.urgency - b.next.urgency);
  const season = seasonFor(
    profile,
    signatures,
    documents,
    ranked[0].item ? { answered: ranked[0].item.desk.intakeAnswered, needs: ranked[0].item.desk.filingNeeds } : emptyIntake(),
    catalog,
  );
  const next = ranked[0].next;
  const current = ranked[0].item;
  const onboarding = onboardingStep(season);
  const letter = next.href === "/portal/engagement" ? await engagementLetter(mine.map((item) => item.id)) : null;
  const shown = letterCopy(letter, next);
  const action = shown.action && shown.href ? (
    readOnly ? <Button className="w-fit" disabled>{shown.action}</Button> : shown.href.startsWith("https://") ? (
      <Button nativeButton={false} className="w-fit" render={<a href={shown.href} target="_blank" rel="noreferrer" />}>{shown.action}</Button>
    ) : (
      <Button nativeButton={false} className="w-fit" render={<Link href={shown.href} />}>{shown.action}</Button>
    )
  ) : null;

  return (
    <>
      {onboarding ? (
        <OnboardingWizard stepId={onboarding} title={shown.headline} detail={shown.detail} action={action} />
      ) : (
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 text-card-foreground">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">This season{current ? ` · ${current.entity} ${current.taxYear}` : ""}</p>
          <h1 className="font-serif text-3xl">{shown.headline}</h1>
          <p className="max-w-xl text-muted-foreground">{shown.detail}</p>
          {action}
        </section>
      )}
      <DocumentRequests messages={messages} readOnly={readOnly} />
      <details id={readOnly ? undefined : "message"} className="rounded-xl border border-border bg-card px-4 py-3 text-card-foreground">
        <summary className="cursor-pointer font-medium">Message the firm</summary>
        <div className="mt-4 flex flex-col gap-4">
          <ul className="flex flex-col gap-2 text-sm">
            {messages.filter((message) => message.kind !== "note").length === 0 ? (
              <li><LiniqoEmpty {...liniqo.notice} className="px-0 py-4" artClassName="size-24">No messages yet.</LiniqoEmpty></li>
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
