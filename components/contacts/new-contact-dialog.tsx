"use client";

import { PlusIcon } from "lucide-react";
import { submitClientInvite } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function NewContactDialog({ description }: { description: string }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="lg" />}>
        <PlusIcon />
        <span className="max-sm:hidden">Invite client</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite client</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={submitClientInvite} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" name="name" />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" required />
            </Field>
          </FieldGroup>
          <Button type="submit">Send invite</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
