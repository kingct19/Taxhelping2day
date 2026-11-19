"use client";

import { saveIdentity } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { IdentityNote } from "@/lib/types";

export function IdentityForm({ clientId, identity }: { clientId: string; identity: IdentityNote | null }) {
  return (
    <form action={saveIdentity} className="flex flex-col gap-3">
      <input type="hidden" name="clientId" value={clientId} />
      <Field orientation="horizontal">
        <Checkbox id="attested" name="attested" value="yes" defaultChecked={identity?.attested ?? false} />
        <FieldLabel htmlFor="attested">I know this taxpayer, or I authenticated their identity</FieldLabel>
      </Field>
      <Field>
        <FieldLabel htmlFor="note">Note for the IRS upload</FieldLabel>
        <Textarea id="note" name="note" defaultValue={identity?.note ?? ""} rows={3} />
      </Field>
      <Button type="submit" variant="outline">
        Save identity note
      </Button>
    </form>
  );
}
