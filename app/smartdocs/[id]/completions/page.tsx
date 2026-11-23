import Link from "next/link";
import { notFound } from "next/navigation";
import { SubpageNav } from "@/components/subpage-nav";
import { requireProfile } from "@/lib/auth";
import { packetDb } from "@/lib/docuseal";
import { packetFiles, packetSigners } from "@/lib/smartdoc-prefill";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f-]{36}$/i;

type CompletionRow = {
  id: string;
  return_id: string;
  recipient: string;
  status: string;
  signer_states: unknown;
  files: unknown;
  sent_at: string;
};

function writtenDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function SmartdocCompletionsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireProfile("staff");
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const db = packetDb();
  if (!db) notFound();
  const [templateResult, packetResult, returns] = await Promise.all([
    db.from("signing_templates").select("id,name").eq("id", id).maybeSingle(),
    db.from("signing_packets").select("id,return_id,recipient,status,signer_states,files,sent_at").eq("template_ref", id).order("sent_at", { ascending: false }),
    getStore().listTeamReturns(),
  ]);
  if (templateResult.error) throw templateResult.error;
  if (packetResult.error) throw packetResult.error;
  if (!templateResult.data) notFound();
  const packets = (packetResult.data ?? []) as CompletionRow[];

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center border-b px-4">
        <SubpageNav
          backHref="/smartdocs"
          backLabel="Back to Smartdocs"
          crumbs={[
            { href: "/smartdocs", label: "Smartdocs" },
            { href: `/smartdocs/${templateResult.data.id}`, label: templateResult.data.name },
            { label: "Completions" },
          ]}
        />
      </header>
      <div className="grid min-h-0 flex-1 content-start gap-6 overflow-auto px-6 py-6">
        <p className="text-sm text-muted-foreground">Each send is its own DocuSeal submission. Status comes from the webhook.</p>
        {packets.length === 0 ? <p className="text-sm text-muted-foreground">Nothing sent yet.</p> : null}
        <ul className="grid gap-4">
        {packets.map((packet) => {
          const item = returns.find((row) => row.id === packet.return_id);
          const files = packetFiles(packet.files);
          const signers = packetSigners(packet.signer_states);
          return (
            <li key={packet.id} className="grid gap-2 rounded-lg border p-4">
              <p className="font-medium">{packet.recipient} · {packet.status}</p>
              <p className="text-sm text-muted-foreground">
                Sent {writtenDate(packet.sent_at)}
                {item ? (
                  <>
                    {" · "}
                    <Link className="underline" href={`/returns/${item.profileId}/${item.id}`}>{item.taxYear} {item.entity}</Link>
                  </>
                ) : null}
              </p>
              {signers.map((signer) => (
                <p key={signer.email} className="text-sm">{signer.email} · {signer.status}</p>
              ))}
              {files.map((file, index) => (
                <a key={`${packet.id}-${index}`} className="text-sm underline" href={`/files/packets/${packet.id}/${index}`}>{file.name}</a>
              ))}
            </li>
          );
        })}
        </ul>
      </div>
    </main>
  );
}
