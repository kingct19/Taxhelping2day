"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { inviteClient, inviteTeammate } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function InviteDialog({
  label,
  title,
  description,
  action,
  variant = "default",
}: {
  label: string;
  title: string;
  description: string;
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const field = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError("");
      }}
    >
      <DialogTrigger render={<Button size="lg" variant={variant} />}>
        <PlusIcon />
        <span className="max-sm:hidden">{label}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          action={async (formData) => {
            const result = await action(formData);
            if (result?.error) {
              setError(result.error);
              return;
            }
            setError("");
            setOpen(false);
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${field}-name`}>Full name</Label>
            <Input id={`${field}-name`} name="name" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${field}-email`}>Email address</Label>
            <Input id={`${field}-email`} name="email" type="email" required />
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit">Send invite</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InviteButtons() {
  return (
    <>
      <InviteDialog
        label="Invite client"
        title="Invite client"
        description="They get an email and a file on this desk."
        action={inviteClient}
        variant="outline"
      />
      <InviteDialog
        label="Invite teammate"
        title="Invite teammate"
        description="They can open the desk after they accept the email."
        action={inviteTeammate}
      />
    </>
  );
}
