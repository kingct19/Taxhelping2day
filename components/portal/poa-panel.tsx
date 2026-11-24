import Link from "next/link";
import { signDocument } from "@/lib/actions";
import { firm } from "@/lib/firm";
import type { Profile, SignatureRecord } from "@/lib/types";
import { SignaturePad } from "@/components/signature-pad";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function PoaPanel({
  profile,
  signed,
  readOnly = false,
}: {
  profile: Profile;
  signed: SignatureRecord | null;
  readOnly?: boolean;
}) {
  const ready = Boolean(profile.name && profile.address && profile.taxIdLast4 && profile.taxYears?.trim());
  return (
    <section id="poa" className="grid gap-3 rounded-lg border border-border bg-card px-3 py-3">
      <Alert>
        <AlertTitle>Form 2848</AlertTitle>
        <AlertDescription>
          Your profile fills the taxpayer lines. {firm.representative} is the representative. A drawn signature is accepted by the IRS only when the firm uploads the PDF at IRS.gov/Submit2848. This portal does not send the form to the IRS.
        </AlertDescription>
      </Alert>
      {signed ? (
        <a className="text-sm underline" href={`/files/signatures/${signed.id}`}>
          Download signed Form 2848
        </a>
      ) : (
        <form action={readOnly ? undefined : signDocument} className="flex flex-col gap-4">
          <input type="hidden" name="kind" value="poa" />
          <p className="text-sm">
            Tax years covered: {profile.taxYears || "Enter your tax years in your profile"}.{" "}
            <Link href="/portal/profile" className="underline">Edit profile</Link>
          </p>
          <SignaturePad />
          <Button type="submit" disabled={readOnly || !ready}>
            Sign Form 2848
          </Button>
          {!ready ? <p className="text-sm text-muted-foreground">Save your name, address, taxpayer ID, and tax years before signing.</p> : null}
        </form>
      )}
    </section>
  );
}
