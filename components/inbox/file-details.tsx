import { IdentityForm } from "@/components/identity-form";
import { Badge } from "@/components/ui/badge";
import { documentKindLabel, type DocumentRecord, type IdentityNote, type Profile, type SignatureRecord } from "@/lib/types";
import { missingRequired, seasonLabel, type SeasonStage } from "@/lib/season";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="max-w-[60%] truncate text-xs font-medium">{value}</span>
    </div>
  );
}

export function FileDetails({
  client,
  stage,
  documents,
  signatures,
  identity,
}: {
  client: Profile;
  stage: SeasonStage;
  documents: DocumentRecord[];
  signatures: SignatureRecord[];
  identity: IdentityNote | null;
}) {
  const needed = stage === "documents" ? missingRequired(client, documents) : [];
  const poa = signatures.some((item) => item.kind === "poa");

  return (
    <aside className="hidden w-80 shrink-0 flex-col gap-5 overflow-auto border-l p-4 xl:flex">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Client</h2>
        <Row label="Name" value={client.name || client.email} />
        <Row label="Email" value={client.email} />
        <Row label="Phone" value={client.phone || "Not on file"} />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">This season</h2>
        <Row label="Stage" value={seasonLabel(stage)} />
        <div className="flex flex-wrap gap-2 px-1">
          <Badge variant={poa ? "success" : "warning"}>{poa ? "Form 2848 signed" : "Form 2848 open"}</Badge>
          <Badge variant={identity?.attested ? "success" : "warning"}>{identity?.attested ? "Identity checked" : "Identity open"}</Badge>
        </div>
        {needed.length > 0 ? <p className="px-1 text-xs text-muted-foreground">Still needed: {needed.join(", ")}.</p> : null}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">On the file</h2>
        {signatures.length === 0 && documents.length === 0 ? (
          <p className="px-1 text-xs text-muted-foreground">No documents or signed forms yet.</p>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            {signatures.map((signature) => (
              <a key={signature.id} className="truncate underline" href={`/files/signatures/${signature.id}`}>
                {signature.kind === "poa" ? "Form 2848" : "Engagement letter"}
              </a>
            ))}
            {documents.map((document) => (
              <a key={document.id} className="truncate underline" href={`/files/documents/${document.id}`}>
                {documentKindLabel(document.kind)}: {document.filename}
              </a>
            ))}
          </div>
        )}
      </section>
      <IdentityForm key={`${client.id}-${identity?.attested ?? false}-${identity?.note ?? ""}`} clientId={client.id} identity={identity} />
    </aside>
  );
}
