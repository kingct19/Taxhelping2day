import { EfilePanel } from "@/components/efile-panel";
import { LetterTrail, letterPhaseLabel } from "@/components/letter-trail";
import { LiniqoEmpty, liniqo } from "@/components/liniqo-empty";
import { PoaPanel } from "@/components/portal/poa-panel";
import { requireProfile } from "@/lib/auth";
import { pickReturn, showPoa } from "@/lib/client-home";
import { packetDb, refreshProfileLetters } from "@/lib/docuseal";
import { engagementLetter, engagementLetterTitle } from "@/lib/engagement-letter";
import { taxpayerTypeLabel } from "@/lib/types";
import { packetFiles } from "@/lib/smartdoc-prefill";
import { getStore } from "@/lib/store";
import { signerLabel } from "@/lib/next-action";
import { shortDate } from "@/lib/return-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type ClientPacket = {
  id: string;
  return_id: string;
  status: string;
  files: unknown;
  template_ref: string | null;
};

export default async function SignaturesPage() {
  const profile = await requireProfile("client");
  await refreshProfileLetters(profile.id);
  const store = getStore();
  const [signatures, messages, returns, authorizations] = await Promise.all([
    store.listSignatures(profile.id),
    store.listMessages(profile.id),
    store.listTeamReturns(),
    store.listAuthorizations(),
  ]);
  const mine = returns.filter((item) => item.profileId === profile.id);
  const current = pickReturn(mine);
  const letter = await engagementLetter(mine.map((item) => item.id));
  const engagement = signatures.find((item) => item.kind === "engagement") ?? null;
  const poa = signatures.find((item) => item.kind === "poa") ?? null;
  const rows = current ? authorizations.filter((item) => item.returnId === current.id && item.returnVersion === current.returnVersion) : [];
  const needed = rows.filter((item) => item.status === "needed");
  const signedAuth = rows.filter((item) => item.status === "signed");
  const poaVisible = showPoa(messages, signatures);
  const poaReady = Boolean(profile.name && profile.address && profile.taxIdLast4 && profile.taxYears?.trim());
  const db = packetDb();
  const packets = db && mine.length
    ? await db.from("signing_packets").select("id,return_id,status,files,template_ref").in("return_id", mine.map((item) => item.id))
    : null;
  if (packets?.error) throw packets.error;
  const packetRows = (packets?.data ?? []) as ClientPacket[];
  const names = new Map<string, { name: string; kind: string | null }>();
  if (db) {
    const templates = await db.from("signing_templates").select("id,name,kind");
    if (templates.error) throw templates.error;
    for (const template of templates.data ?? []) names.set(template.id, { name: template.name, kind: template.kind });
  }

  const awaitingLetter = letter.status === "unsigned" && !engagement;
  const awaitingEfile = Boolean(current) && rows.length === 0;
  const awaitingPoa = poaVisible && !poa && !poaReady;
  const letterPacket = letter.status === "unsigned" ? null : letter.packetId;
  const openLetter = letter.status === "sent" || letter.status === "opened" ? letter : null;
  const finishedLetter = letter.status === "signed" || letter.status === "declined" ? letter : null;
  const readyPoa = poaVisible && !poa && poaReady;
  const openPackets = packetRows.filter((packet) => packet.status !== "completed" && packet.id !== letterPacket);
  const donePackets = packetRows.filter((packet) => packet.status === "completed" && (packet.id !== letterPacket || !engagement));
  const ready = Boolean(openLetter) || needed.length > 0 || readyPoa;
  const preparing = awaitingLetter || awaitingEfile || awaitingPoa || openPackets.length > 0;
  const completed = Boolean(engagement) || Boolean(finishedLetter) || signedAuth.length > 0 || donePackets.length > 0 || Boolean(poa);

  return (
    <div className="grid gap-5">
      <header className="grid gap-1">
        <h1 className="font-serif text-3xl">Signatures</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          The engagement letter, Form 8879, and Form 2848 stay separate. Signing here does not file a return or a power of attorney with the IRS.
        </p>
      </header>

      {!ready && !preparing && !completed ? (
        <LiniqoEmpty id={liniqo.contract.id} title="Nothing to sign yet">
          Documents appear here when the firm prepares them.
        </LiniqoEmpty>
      ) : null}

      {ready ? (
        <section className="grid gap-2">
          <h2 className="text-sm font-medium">Ready to sign</h2>
          {openLetter ? (
            <article className="grid gap-3 rounded-xl bg-card px-3 py-3 ring-1 ring-foreground/10">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{openLetter.title}</p>
                <Badge variant="progress">{letterPhaseLabel(openLetter.status)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">This starts the work. It does not authorize e-file.</p>
              <LetterTrail phase={openLetter.status} sentAt={openLetter.sentAt} openedAt={openLetter.openedAt} signedAt={openLetter.signedAt} />
              {openLetter.href ? (
                <Button nativeButton={false} className="w-fit" size="sm" render={<a href={openLetter.href} target="_blank" rel="noreferrer" />}>
                  Review and sign
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Open the DocuSeal email to finish signing. The signed copy appears here afterward.</p>
              )}
            </article>
          ) : null}
          {current && needed.length > 0 ? (
            <EfilePanel mode="client" profileId={profile.id} returnId={current.id} returnVersion={current.returnVersion} authorizations={authorizations} />
          ) : null}
          {readyPoa ? <PoaPanel profile={profile} signed={null} /> : null}
        </section>
      ) : null}

      {preparing ? (
        <section className="grid gap-2">
          <h2 className="text-sm font-medium">Awaiting preparation</h2>
          {awaitingLetter ? (
            <p className="rounded-xl bg-card px-3 py-3 text-sm text-muted-foreground ring-1 ring-foreground/10">The firm prepares your engagement letter. It will show here when they send it.</p>
          ) : null}
          {awaitingEfile ? (
            <p className="rounded-xl bg-card px-3 py-3 text-sm text-muted-foreground ring-1 ring-foreground/10">Form 8879 is requested when a return version is ready to e-file.</p>
          ) : null}
          {awaitingPoa ? (
            <p className="rounded-xl bg-card px-3 py-3 text-sm text-muted-foreground ring-1 ring-foreground/10">Form 2848 needs your name, address, taxpayer ID, and tax years before you can sign.</p>
          ) : null}
          {openPackets.map((packet) => {
            const item = mine.find((row) => row.id === packet.return_id);
            const template = packet.template_ref ? names.get(packet.template_ref) : undefined;
            const title = item && template?.kind === "engagement"
              ? engagementLetterTitle({ name: profile.name, year: item.taxYear, type: taxpayerTypeLabel(item.taxpayerType).toLowerCase(), entity: item.entity })
              : template?.name || "Document";
            return (
              <article key={packet.id} className="rounded-xl bg-card px-3 py-3 text-sm ring-1 ring-foreground/10">
                <p className="font-medium">{title}</p>
                <p className="text-muted-foreground">{item ? `${item.entity} · ${item.taxYear} · ` : ""}{packet.status}</p>
              </article>
            );
          })}
        </section>
      ) : null}

      {completed ? (
        <section className="grid gap-2">
          <h2 className="text-sm font-medium">Completed</h2>
          {finishedLetter ? (
            <article className="grid gap-3 rounded-xl bg-card px-3 py-3 ring-1 ring-foreground/10">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{finishedLetter.title}</p>
                <Badge variant={finishedLetter.status === "signed" ? "success" : "destructive"}>{letterPhaseLabel(finishedLetter.status)}</Badge>
              </div>
              <LetterTrail phase={finishedLetter.status} sentAt={finishedLetter.sentAt} openedAt={finishedLetter.openedAt} signedAt={finishedLetter.signedAt} />
              {engagement ? (
                <a className="text-sm underline" href={`/files/signatures/${engagement.id}`}>
                  Download signed engagement letter{engagement.signedAt ? ` · ${shortDate(engagement.signedAt)}` : ""}
                </a>
              ) : null}
            </article>
          ) : engagement ? (
            <a className="text-sm underline" href={`/files/signatures/${engagement.id}`}>
              Download signed engagement letter{engagement.signedAt ? ` · ${shortDate(engagement.signedAt)}` : ""}
            </a>
          ) : null}
          {signedAuth.map((item) => (
            <p key={item.id} className="text-sm">
              Form 8879 · {signerLabel(item.signer)} · signed {item.signedAt ? shortDate(item.signedAt) : ""}
              {item.method === "manual" ? " · paper, recorded by the firm" : " · typed authorization for this version"}
            </p>
          ))}
          {donePackets.map((packet) => {
            const template = packet.template_ref ? names.get(packet.template_ref) : undefined;
            const item = mine.find((row) => row.id === packet.return_id);
            const title = item && template?.kind === "engagement"
              ? engagementLetterTitle({ name: profile.name, year: item.taxYear, type: taxpayerTypeLabel(item.taxpayerType).toLowerCase(), entity: item.entity })
              : template?.name || "Signed document";
            const files = packetFiles(packet.files);
            return files.map((file, index) => (
              <a key={`${packet.id}-${index}`} className="text-sm underline" href={`/files/packets/${packet.id}/${index}`}>
                Download {title} · {file.name}
              </a>
            ));
          })}
          {poa ? (
            <a className="text-sm underline" href={`/files/signatures/${poa.id}`}>
              Download signed Form 2848{poa.signedAt ? ` · ${shortDate(poa.signedAt)}` : ""}
            </a>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
