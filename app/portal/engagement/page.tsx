import { packetDb } from "@/lib/docuseal";
import { requireProfile } from "@/lib/auth";
import { packetFiles } from "@/lib/smartdoc-prefill";
import { getStore } from "@/lib/store";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

type ClientPacket = {
  id: string;
  return_id: string;
  status: string;
  files: unknown;
  template_ref: string | null;
};

export default async function EngagementPage() {
  const profile = await requireProfile("client");
  const signatures = await getStore().listSignatures(profile.id);
  const returns = await getStore().listReturns(profile.id);
  const db = packetDb();
  const packets = db && returns.length
    ? await db.from("signing_packets").select("id,return_id,status,files,template_ref").in("return_id", returns.map((item) => item.id))
    : null;
  if (packets?.error) throw packets.error;
  const names = new Map<string, string>();
  if (db) {
    const templates = await db.from("signing_templates").select("id,name");
    if (templates.error) throw templates.error;
    for (const template of templates.data ?? []) names.set(template.id, template.name);
  }
  const signed = signatures.find((item) => item.kind === "engagement");
  const rows = (packets?.data ?? []) as ClientPacket[];

  return (
    <>
      <h1 className="font-serif text-3xl">Engagement letter</h1>
      <Alert>
        <AlertTitle>Documents for signature</AlertTitle>
        <AlertDescription>
          Your preparer emails each document that needs a signature. A signed copy appears here after it is complete.
        </AlertDescription>
      </Alert>
      {rows.map((packet) => {
        const item = returns.find((row) => row.id === packet.return_id);
        const files = packetFiles(packet.files);
        const title = (packet.template_ref && names.get(packet.template_ref)) || "Engagement letter";
        return (
          <section key={packet.id} className="grid gap-1">
            <h2 className="font-medium">{title}</h2>
            <p className="text-sm text-muted-foreground">{item?.entity} · {item?.taxYear} · {packet.status}</p>
            {files.map((file, index) => (
              <a key={`${packet.id}-${index}`} className="underline" href={`/files/packets/${packet.id}/${index}`}>{file.name}</a>
            ))}
          </section>
        );
      })}
      {signed ? (
        <a className="underline" href={`/files/signatures/${signed.id}`}>
          Download signed letter
        </a>
      ) : null}
      {rows.length === 0 && !signed ? <p>Your preparer will send your engagement letter by email for signature.</p> : null}
    </>
  );
}
