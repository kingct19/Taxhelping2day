import Link from "next/link";
import { LetterTrail, letterPhaseLabel, signingPhase } from "@/components/letter-trail";
import { packetDb, signingConfigured } from "@/lib/docuseal";
import { engagementLetterTitle } from "@/lib/engagement-letter";
import { packetFiles, packetSigners } from "@/lib/smartdoc-prefill";
import { getStore } from "@/lib/store";
import { taxpayerTypeLabel } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { sendEngagement } from "@/lib/signing-actions";
import { SendDocumentForm } from "@/components/smartdocs/send-document-form";
import { Button } from "@/components/ui/button";

type LibraryTemplate = { id: string; name: string; kind: string | null; docuseal_template_id: number | null; archived_at: string | null };

export async function EngagementPacket({ profileId, returnId, email }: { profileId: string; returnId: string; email: string }) {
  const db = packetDb();
  const store = getStore();
  const [client, returns] = await Promise.all([store.getProfile(profileId), store.listReturns(profileId)]);
  const filed = returns.find((item) => item.id === returnId);
  const letterTitle = filed
    ? engagementLetterTitle({
        name: client?.name || filed.entity,
        year: filed.taxYear,
        type: taxpayerTypeLabel(filed.taxpayerType).toLowerCase(),
        entity: filed.entity,
      })
    : "Engagement letter";
  const packetsResult = db ? await db.from("signing_packets").select("id,template_id,template_ref,recipient,status,signer_states,files,sent_at").eq("return_id", returnId) : null;
  if (packetsResult?.error) throw packetsResult.error;
  const templatesResult = db ? await db.from("signing_templates").select("id,name,kind,docuseal_template_id,archived_at").order("name") : null;
  if (templatesResult?.error) throw templatesResult.error;
  const templates = (templatesResult?.data ?? []) as LibraryTemplate[];
  const packets = packetsResult?.data ?? [];
  const library = templates.filter((template) => !template.archived_at && template.docuseal_template_id);
  const envTemplate = Number(process.env.DOCUSEAL_ENGAGEMENT_TEMPLATE_ID);
  const envInLibrary = library.some((template) => template.docuseal_template_id === envTemplate);
  const envSent = packets.some((packet) => packet.template_id === envTemplate && !packet.template_ref);

  return (
    <section className="grid gap-3 rounded-md border p-4">
      <div>
        <h2 className="text-sm font-medium">Send a document</h2>
        <p className="mt-1 text-sm text-muted-foreground">The client gets an email from DocuSeal. A signature here is for this return.</p>
      </div>
      {packets.map((packet) => {
        const files = packetFiles(packet.files);
        const signers = packetSigners(packet.signer_states);
        const signer = signers[0];
        const phase = signingPhase(packet.status, signer);
        const template = templates.find((item) => item.id === packet.template_ref);
        const engagement = template?.kind === "engagement" || (!packet.template_ref && packet.template_id === envTemplate);
        const title = engagement ? letterTitle : template?.name || "Document";
        return (
          <div key={packet.id} className="grid gap-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{title}</p>
              <Badge variant={phase === "signed" ? "success" : phase === "declined" ? "destructive" : "progress"}>{letterPhaseLabel(phase)}</Badge>
            </div>
            <p className="text-muted-foreground">{packet.recipient}</p>
            <LetterTrail
              phase={phase}
              sentAt={signer?.sentAt || packet.sent_at || null}
              openedAt={signer?.openedAt || null}
              signedAt={signer?.completedAt || null}
            />
            {files.map((file, index) => (
              <a className="underline" key={`${packet.id}-${index}`} href={`/files/packets/${packet.id}/${index}`}>{file.name}</a>
            ))}
          </div>
        );
      })}
      {library.length > 0 ? (
        <SendDocumentForm profileId={profileId} returnId={returnId} email={email} templates={library} />
      ) : null}
      {signingConfigured() && !envInLibrary && !envSent ? (
        <form action={sendEngagement.bind(null, profileId, returnId)}>
          <Button type="submit" size="sm" variant="outline">Send engagement letter to {email}</Button>
        </form>
      ) : null}
      {db && library.length === 0 && !(signingConfigured() && !envInLibrary && !envSent) ? (
        <p className="text-sm text-muted-foreground">
          <Link className="underline" href="/smartdocs">Create a smartdoc</Link> before sending a document for signature.
        </p>
      ) : null}
      {!db ? <p className="text-sm text-muted-foreground">Connect Supabase and DocuSeal to send documents for signature.</p> : null}
    </section>
  );
}
