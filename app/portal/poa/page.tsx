import Link from "next/link";
import { signDocument } from "@/lib/actions";
import { requireProfile } from "@/lib/auth";
import { firm } from "@/lib/firm";
import { getStore } from "@/lib/store";
import { SignaturePad } from "@/components/signature-pad";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function PoaPage() {
  const profile = await requireProfile("client");
  const signatures = await getStore().listSignatures(profile.id);
  const signed = signatures.find((item) => item.kind === "poa");
  const ready = Boolean(profile.name && profile.address && profile.taxIdLast4 && profile.taxYears?.trim());

  return (
    <>
      <h1 className="font-serif text-3xl">Power of attorney</h1>
      <Alert>
        <AlertTitle>Form 2848</AlertTitle>
        <AlertDescription>
          Your profile fills the taxpayer lines. {firm.representative} is the representative. A drawn signature is accepted by the IRS only when the firm uploads the PDF at IRS.gov/Submit2848. This portal does not send the form to the IRS.
        </AlertDescription>
      </Alert>
      {signed ? (
        <a className="underline" href={`/files/signatures/${signed.id}`}>
          Download signed Form 2848
        </a>
      ) : null}
      <form action={signDocument} className="flex flex-col gap-4">
        <input type="hidden" name="kind" value="poa" />
        <p>Tax years covered: {profile.taxYears || "Enter your tax years in your profile"}. <Link href="/portal/profile" className="underline">Edit profile</Link></p>
        <SignaturePad />
        <Button type="submit" disabled={!ready}>
          Sign Form 2848
        </Button>
        {!ready ? <p className="text-sm text-muted-foreground">Save your name, address, taxpayer ID, and tax years before signing.</p> : null}
      </form>
    </>
  );
}
