"use client";

import { useActionState, useState } from "react";
import { saveProfile, type ProfileSaveState } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { taxpayerTypeLabel, taxpayerTypes, type Profile, type TaxpayerType } from "@/lib/types";

const initialState: ProfileSaveState = { error: null };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [taxpayerType, setTaxpayerType] = useState<TaxpayerType>(profile.taxpayerType);
  const [state, formAction, pending] = useActionState(saveProfile, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="taxpayerType" value={taxpayerType} />
      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
      <FieldSet className="rounded-lg border border-border px-3 py-3">
        <FieldLegend>Personal details</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">Legal name</FieldLabel>
            <Input id="name" name="name" defaultValue={profile.name} required autoComplete="name" />
            <FieldDescription>This name is copied onto documents we prepare.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Who we are helping</FieldLabel>
            <Select
              value={taxpayerType}
              onValueChange={(value) => {
                if (value === "individual" || value === "business" || value === "nonprofit") setTaxpayerType(value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {taxpayerTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {taxpayerTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </FieldSet>
      <FieldSet className="rounded-lg border border-border px-3 py-3">
        <FieldLegend>Contact information</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel>Email</FieldLabel>
            <p className="text-sm">{profile.email}</p>
            <FieldDescription>Sign-in email. Contact the firm if this needs to change.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="phone">Phone</FieldLabel>
            <Input id="phone" name="phone" defaultValue={profile.phone} autoComplete="tel" inputMode="tel" />
          </Field>
          <Field>
            <FieldLabel htmlFor="address">Street address</FieldLabel>
            <Input id="address" name="address" defaultValue={profile.address} required autoComplete="street-address" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="city">City</FieldLabel>
              <Input id="city" name="city" defaultValue={profile.city} autoComplete="address-level2" />
            </Field>
            <Field>
              <FieldLabel htmlFor="state">State</FieldLabel>
              <Input id="state" name="state" defaultValue={profile.state} maxLength={2} autoComplete="address-level1" />
            </Field>
            <Field>
              <FieldLabel htmlFor="zip">ZIP</FieldLabel>
              <Input id="zip" name="zip" defaultValue={profile.zip} autoComplete="postal-code" inputMode="numeric" />
            </Field>
          </div>
        </FieldGroup>
      </FieldSet>
      <FieldSet className="rounded-lg border border-border px-3 py-3">
        <FieldLegend>Household information</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="spouseName">Spouse name</FieldLabel>
            <Input id="spouseName" name="spouseName" defaultValue={profile.spouseName} autoComplete="off" />
            <FieldDescription>Leave blank if you are not filing with a spouse.</FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>
      <FieldSet className="rounded-lg border border-border px-3 py-3">
        <FieldLegend>Tax-related details</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="taxYears">Tax years</FieldLabel>
            <Input id="taxYears" name="taxYears" defaultValue={profile.taxYears} placeholder="2024, 2025" />
          </Field>
          <Field>
            <FieldLabel htmlFor="taxId">{taxpayerType === "individual" ? "Social Security number" : "EIN"}</FieldLabel>
            <Input
              id="taxId"
              name="taxId"
              inputMode="numeric"
              autoComplete="off"
              placeholder={profile.taxIdLast4 ? `On file, ending ${profile.taxIdLast4}` : ""}
            />
            <FieldDescription>Stored encrypted. Leave blank to keep the number already on file. It is not sent to an AI service.</FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>
      {pending ? <p className="text-sm text-muted-foreground">Saving your details…</p> : null}
    </form>
  );
}
