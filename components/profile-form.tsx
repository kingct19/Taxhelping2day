"use client";

import { useState } from "react";
import { saveProfile } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { taxpayerTypeLabel, taxpayerTypes, type Profile, type TaxpayerType } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [taxpayerType, setTaxpayerType] = useState<TaxpayerType>(profile.taxpayerType);

  return (
    <form action={saveProfile} className="flex flex-col gap-5">
      <input type="hidden" name="taxpayerType" value={taxpayerType} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Legal name</FieldLabel>
          <Input id="name" name="name" defaultValue={profile.name} required />
          <FieldDescription>This name is copied onto every document.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="phone">Phone</FieldLabel>
          <Input id="phone" name="phone" defaultValue={profile.phone} />
        </Field>
        <Field>
          <FieldLabel htmlFor="address">Street address</FieldLabel>
          <Input id="address" name="address" defaultValue={profile.address} required />
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="city">City</FieldLabel>
            <Input id="city" name="city" defaultValue={profile.city} />
          </Field>
          <Field>
            <FieldLabel htmlFor="state">State</FieldLabel>
            <Input id="state" name="state" defaultValue={profile.state} maxLength={2} />
          </Field>
          <Field>
            <FieldLabel htmlFor="zip">ZIP</FieldLabel>
            <Input id="zip" name="zip" defaultValue={profile.zip} />
          </Field>
        </div>
        <Field>
          <FieldLabel>Who we are helping</FieldLabel>
          <Select
            value={taxpayerType}
            onValueChange={(value) => {
              if (value === "individual" || value === "business" || value === "nonprofit") {
                setTaxpayerType(value);
              }
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
        <Field>
          <FieldLabel htmlFor="spouseName">Spouse name</FieldLabel>
          <Input id="spouseName" name="spouseName" defaultValue={profile.spouseName} />
        </Field>
        <Field>
          <FieldLabel htmlFor="taxYears">Tax years</FieldLabel>
          <Input id="taxYears" name="taxYears" defaultValue={profile.taxYears} placeholder="2024, 2025" />
        </Field>
        <Field>
          <FieldLabel htmlFor="taxId">{taxpayerType === "individual" ? "Social Security number" : "EIN"}</FieldLabel>
          <Input id="taxId" name="taxId" inputMode="numeric" autoComplete="off" placeholder={profile.taxIdLast4 ? `On file, ending ${profile.taxIdLast4}` : ""} />
          <FieldDescription>Stored encrypted. Leave blank to keep the number already on file. It is not sent to an AI service.</FieldDescription>
        </Field>
      </FieldGroup>
      <Button type="submit">Save profile</Button>
    </form>
  );
}
