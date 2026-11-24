import Link from "next/link";
import { packetDb, signingConfigured } from "@/lib/docuseal";
import { packetFiles, packetSigners } from "@/lib/smartdoc-prefill";
import { sendEngagement, sendSmartdocToReturn } from "@/lib/signing-actions";
import { Button } from "@/components/ui/button";

const selectStyle = "h-8 w-full rounded-lg border border-input bg-white px-2 text-sm";

type LibraryTemplate = { id: string; name: string; docuseal_template_id: number | null; archived_at: string | null };

export async function EngagementPacket({ profileId, returnId, email }: { profileId: string; returnId: string; email: string }) {
  const db = packetDb();
  const packetsResult = db ? await db.from("signing_packets").select("id,template_id,template_ref,recipient,status,signer_states,files").eq("return_id", returnId) : null;
  if (packetsResult?.error) throw packetsResult.error;
  const templatesResult = db ? await db.from("signing_templates").select("id,name,docuseal_template_id,archived_at").is("archived_at", null).order("name") : null;
  if (templatesResult?.error) throw templatesResult.error;
  const packets = packetsResult?.data ?? [];
  const library = ((templatesResult?.data ?? []) as LibraryTemplate[]).filter((template) => template.docuseal_template_id);
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
        return (
          <div key={packet.id} className="grid gap-1 text-sm">
            <p>{packet.recipient} · {packet.status}</p>
            {packetSigners(packet.signer_states).map((person) => (
              <p key={person.email} className="text-muted-foreground">{person.email} · {person.status}</p>
            ))}
            {files.map((file, index) => (
              <a className="underline" key={`${packet.id}-${index}`} href={`/files/packets/${packet.id}/${index}`}>{file.name}</a>
            ))}
          </div>
        );
      })}
      {library.length > 0 ? (
        <form action={sendSmartdocToReturn.bind(null, profileId, returnId)} className="grid gap-2">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">Document</span>
            <select className={selectStyle} name="template" defaultValue={library[0]?.id}>
              {library.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
          </label>
          <Button type="submit" size="sm" className="w-fit">Send to {email}</Button>
        </form>
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
