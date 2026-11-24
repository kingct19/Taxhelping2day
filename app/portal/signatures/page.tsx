import { EfilePanel } from "@/components/efile-panel";
import { LiniqoEmpty, liniqo } from "@/components/liniqo-empty";
import { PoaPanel } from "@/components/portal/poa-panel";
import { requireProfile } from "@/lib/auth";
import { pickReturn, showPoa } from "@/lib/client-home";
import { packetDb } from "@/lib/docuseal";
import { engagementLetter } from "@/lib/engagement-letter";
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
  const names = new Map<string, string>();
  if (db) {
    const templates = await db.from("signing_templates").select("id,name");
    if (templates.error) throw templates.error;
    for (const template of templates.data ?? []) names.set(template.id, template.name);
  }

  const awaitingLetter = letter.status === "unsigned" && !engagement;
  const awaitingEfile = Boolean(current) && rows.length === 0;
  const awaitingPoa = poaVisible && !poa && !poaReady;
  const readyLetter = letter.status === "ready";
  const readyPoa = poaVisible && !poa && poaReady;
  const pendingLetter = letter.status === "waiting" && !engagement;
  const openPackets = packetRows.filter((packet) => packet.status !== "completed");
  const donePackets = packetRows.filter((packet) => packet.status === "completed");
  const ready = readyLetter || needed.length > 0 || readyPoa || pendingLetter;
  const preparing = awaitingLetter || awaitingEfile || awaitingPoa || openPackets.length > 0;
  const completed = Boolean(engagement) || signedAuth.length > 0 || donePackets.length > 0 || Boolean(poa);

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
          {readyLetter ? (
            <article className="grid gap-2 rounded-xl bg-card px-3 py-3 ring-1 ring-foreground/10">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{letter.title}</p>
                <Badge variant="progress">Engagement letter</Badge>
              </div>
              <p className="text-sm text-muted-foreground">This starts the work. It does not authorize e-file.</p>
              <Button nativeButton={false} className="w-fit" size="sm" render={<a href={letter.href} target="_blank" rel="noreferrer" />}>
                Review and sign
              </Button>
            </article>
          ) : null}
          {pendingLetter ? (
            <article className="grid gap-1 rounded-xl bg-card px-3 py-3 text-sm ring-1 ring-foreground/10">
              <p className="font-medium">Engagement letter</p>
              <p className="text-muted-foreground">Sent by email. Open the DocuSeal message to finish it. The signed copy appears here afterward.</p>
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
            const title = (packet.template_ref && names.get(packet.template_ref)) || "Document";
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
          {engagement ? (
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
            const title = (packet.template_ref && names.get(packet.template_ref)) || "Signed document";
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
