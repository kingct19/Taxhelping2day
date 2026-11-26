import Link from "next/link";
import { ClientFacts } from "@/components/contacts/client-facts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clientTabHref, partitionReturns, returnTitle } from "@/lib/client-file";
import { catalogLabel, type FilingCatalog } from "@/lib/filing-catalog";
import { shortDate } from "@/lib/return-progress";
import { stages, type TeamReturn } from "@/lib/return-workflow";
import { filingTypesOf, type DocumentRecord, type IdentityNote, type Profile, type SignatureRecord } from "@/lib/types";

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="grid gap-0.5 border-t py-2 first:border-t-0 first:pt-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </li>
  );
}

export function ClientOverview({
  profile,
  catalog,
  labels,
  returns,
  documents,
  signatures,
  identity,
}: {
  profile: Profile;
  catalog: FilingCatalog;
  labels: Record<string, string>;
  returns: TeamReturn[];
  documents: DocumentRecord[];
  signatures: SignatureRecord[];
  identity: IdentityNote | null;
}) {
  const { open, filed } = partitionReturns(returns);
  const engagement = signatures.find((item) => item.kind === "engagement") ?? null;
  const poa = signatures.find((item) => item.kind === "poa") ?? null;
  const filing = filingTypesOf(profile).map((type) => catalogLabel(catalog, type)).join(", ") || "Not on file";

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section className="grid content-start gap-2 rounded-lg border p-3 lg:col-span-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Open returns</h2>
          <Button nativeButton={false} variant="outline" size="sm" render={<Link href={clientTabHref(profile.id, "returns")} />}>
            View all
          </Button>
        </div>
        {open.length === 0 ? <p className="text-sm text-muted-foreground">No open returns.</p> : (
          <ul className="grid gap-2">
            {open.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 rounded-lg border px-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{returnTitle(item, labels)}</p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{item.entity}</p>
                  <div className="mt-2">
                    <Badge variant="neutral">{stages[item.stage]}</Badge>
                  </div>
                </div>
                <Button nativeButton={false} size="sm" className="shrink-0" render={<Link href={`/returns/${item.profileId}/${item.id}`} />}>
                  Open
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <ClientFacts profile={profile} catalog={catalog} />
      <section className="grid content-start gap-3 rounded-lg border p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">On this file</h2>
          <Button nativeButton={false} variant="outline" size="sm" render={<Link href={clientTabHref(profile.id, "signed")} />}>
            View all
          </Button>
        </div>
        <ul className="grid">
          <SnapshotRow label="Filing" value={filing} />
          <SnapshotRow label="Open returns" value={open.length === 0 ? "None" : String(open.length)} />
          <SnapshotRow label="Filed years" value={filed.length === 0 ? "None" : String(filed.length)} />
          <SnapshotRow label="Files" value={documents.length === 0 ? "None uploaded" : String(documents.length)} />
          <SnapshotRow label="Engagement letter" value={engagement ? `Signed ${shortDate(engagement.signedAt)}` : "Still open"} />
          <SnapshotRow label="Form 2848" value={poa ? `Signed ${shortDate(poa.signedAt)}` : "Still open"} />
          <SnapshotRow
            label="Identity"
            value={identity?.attested ? `Checked${identity.attestedAt ? ` ${shortDate(identity.attestedAt)}` : ""}` : "Still open"}
          />
        </ul>
      </section>
    </div>
  );
}
