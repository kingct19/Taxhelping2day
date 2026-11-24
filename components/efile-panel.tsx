import { attestEfile, recordManualEfile, requestSignatures, reviseReturn } from "@/lib/actions";
import { signerLabel } from "@/lib/next-action";
import type { EfileAuthorization } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function authorizationCopy(mode: "staff" | "client") {
  switch (mode) {
    case "staff":
      return "This lets the firm e-file this version. It is separate from the engagement letter. If the numbers change, ask again.";
    case "client":
      return "This authorizes e-file for this version of the return. It is not the engagement letter and it is not Form 2848. A typed name is a record for the firm. A paper signature can be recorded if identity proof fails.";
    default: {
      const exhaustive: never = mode;
      return exhaustive;
    }
  }
}

export function EfilePanel({
  profileId,
  returnId,
  returnVersion,
  authorizations,
  mode,
}: {
  profileId: string;
  returnId: string;
  returnVersion: number;
  authorizations: EfileAuthorization[];
  mode: "staff" | "client";
}) {
  const rows = authorizations.filter((item) => item.returnId === returnId && item.returnVersion === returnVersion);
  return (
    <section className="grid gap-3 rounded-md border p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Form 8879</h2>
        <Badge variant="neutral">Version {returnVersion}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {authorizationCopy(mode)}
      </p>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No authorization has been requested for this version.</p>}
      <ul className="grid">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 border-t py-2 first:border-t-0 first:pt-0">
            <span className="text-sm">
              {signerLabel(row.signer)}
              {row.method === "manual" ? <span className="text-muted-foreground"> · paper</span> : null}
            </span>
            <Badge variant={row.status === "signed" ? "success" : "progress"}>
              {row.status === "signed" ? `Signed ${row.signedAt?.slice(0, 10) ?? ""}` : "Needed"}
            </Badge>
          </li>
        ))}
      </ul>
      {mode === "staff" && (
        <div className="flex flex-wrap gap-2">
          <form action={requestSignatures.bind(null, profileId, returnId)}><Button type="submit" size="sm">Ask for Form 8879</Button></form>
          <form action={reviseReturn.bind(null, profileId, returnId)}><Button type="submit" size="sm" variant="outline">Numbers changed</Button></form>
        </div>
      )}
      {mode === "staff" && rows.filter((row) => row.status === "needed").map((row) => (
        <form key={row.signer} action={recordManualEfile.bind(null, profileId, returnId)} className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{signerLabel(row.signer)} paper signature</span>
          <div className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="signer" value={row.signer} />
            <Input name="note" required maxLength={1000} aria-label={`How the ${signerLabel(row.signer).toLowerCase()} signed on paper`} placeholder={`${signerLabel(row.signer)} signed on paper`} className="min-w-40 flex-1" />
            <Button type="submit" size="sm" variant="outline">Record</Button>
          </div>
        </form>
      ))}
      {mode === "client" && rows.filter((row) => row.status === "needed").map((row) => (
        <form key={row.signer} action={attestEfile.bind(null, returnId)} className="grid gap-2">
          <input type="hidden" name="signer" value={row.signer} />
          <Input name="name" required aria-label={`${signerLabel(row.signer)} name`} placeholder={row.signer === "spouse" ? "Spouse name, as it appears on the return" : "Your name, as it appears on the return"} />
          <label className="flex items-start gap-2 text-sm">
            <input className="mt-1" type="checkbox" name="confirm" value="yes" required />
            I authorize the firm to e-file version {returnVersion} of this return.
          </label>
          <Button className="w-fit" type="submit">Record {signerLabel(row.signer).toLowerCase()} authorization</Button>
        </form>
      ))}
    </section>
  );
}
