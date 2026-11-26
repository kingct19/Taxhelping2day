import { EngagementLetterForm } from "@/components/contacts/engagement-letter-form";
import { IdentityForm } from "@/components/identity-form";
import { Badge } from "@/components/ui/badge";
import { signerLabel } from "@/lib/next-action";
import { shortDate } from "@/lib/return-progress";
import type { TeamReturn } from "@/lib/return-workflow";
import { type EfileAuthorization, type EfileSigner, type IdentityNote, type SignatureRecord } from "@/lib/types";

function authorizationLabel(status: EfileAuthorization["status"]): string {
  switch (status) {
    case "needed":
      return "Needed";
    case "signed":
      return "Signed";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function authorizationTone(status: EfileAuthorization["status"]): "success" | "warning" {
  switch (status) {
    case "signed":
      return "success";
    case "needed":
      return "warning";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function signerRank(signer: EfileSigner): number {
  switch (signer) {
    case "taxpayer":
      return 0;
    case "spouse":
      return 1;
    default: {
      const exhaustive: never = signer;
      return exhaustive;
    }
  }
}

function SignedDownload({ id, label, signedAt }: { id: string; label: string; signedAt: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">Signed {shortDate(signedAt)}</p>
      <a className="text-sm underline" href={`/files/signatures/${id}`}>
        {label}
      </a>
    </div>
  );
}

export async function ClientSignatures({
  profileId,
  signatures,
  identity,
  returns,
  authorizations,
}: {
  profileId: string;
  signatures: SignatureRecord[];
  identity: IdentityNote | null;
  returns: TeamReturn[];
  authorizations: EfileAuthorization[];
}) {
  const engagement = signatures.find((item) => item.kind === "engagement") ?? null;
  const poa = signatures.find((item) => item.kind === "poa") ?? null;
  const byReturn = new Map(returns.map((item) => [item.id, item]));
  const listed = authorizations
    .flatMap((authorization) => {
      const item = byReturn.get(authorization.returnId);
      return item ? [{ authorization, item }] : [];
    })
    .sort(
      (a, b) =>
        b.item.taxYear - a.item.taxYear ||
        a.item.entity.localeCompare(b.item.entity) ||
        signerRank(a.authorization.signer) - signerRank(b.authorization.signer) ||
        b.authorization.returnVersion - a.authorization.returnVersion,
    );

  return (
    <div className="grid gap-3">
      <section className="grid gap-3 rounded-lg border p-3">
        {engagement ? (
          <div className="grid gap-2">
            <h2 className="text-sm font-medium">Engagement letter</h2>
            <SignedDownload id={engagement.id} label="Download signed engagement letter" signedAt={engagement.signedAt} />
          </div>
        ) : (
          <EngagementLetterForm
            profileId={profileId}
            returns={returns.map((item) => ({ id: item.id, taxYear: item.taxYear, entity: item.entity }))}
          />
        )}
      </section>
      <section className="grid gap-3 rounded-lg border p-3">
        <h2 className="text-sm font-medium">Form 2848</h2>
        {poa ? (
          <SignedDownload id={poa.id} label="Download signed Form 2848" signedAt={poa.signedAt} />
        ) : (
          <p className="text-sm text-muted-foreground">Form 2848 is still open.</p>
        )}
        <p className="text-sm text-muted-foreground">
          {identity?.attested
            ? `Identity checked${identity.attestedAt ? ` on ${shortDate(identity.attestedAt)}` : ""}.`
            : "Identity is still open."}
        </p>
        <IdentityForm
          key={`${profileId}-${identity?.attested ?? false}-${identity?.note ?? ""}`}
          clientId={profileId}
          identity={identity}
        />
      </section>
      <section className="grid content-start gap-2 rounded-lg border p-3">
        <h2 className="text-sm font-medium">E-file authorizations</h2>
        {listed.length === 0 ? <p className="text-sm text-muted-foreground">None recorded.</p> : null}
        {listed.length > 0 ? (
          <ul className="grid gap-2">
            {listed.map(({ authorization, item }) => (
              <li key={authorization.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium">
                    {item.taxYear} {item.entity}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {signerLabel(authorization.signer)} · Version {authorization.returnVersion}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {authorization.signedAt ? (
                    <span className="text-sm text-muted-foreground">{shortDate(authorization.signedAt)}</span>
                  ) : null}
                  <Badge variant={authorizationTone(authorization.status)}>{authorizationLabel(authorization.status)}</Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
