"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { inviteClient, inviteTeammate } from "@/lib/actions";
import { rankLabel, staffRanks, type StaffRank } from "@/lib/teammates";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function InviteDialog({
  label,
  title,
  description,
  action,
  variant = "default",
  rank = false,
}: {
  label: string;
  title: string;
  description: string;
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  variant?: "default" | "outline";
  rank?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [staffRank, setStaffRank] = useState<StaffRank>("staff");
  const field = label.toLowerCase().replace(/\s+/g, "-");
  const rankItems = staffRanks.map((item) => ({ label: rankLabel(item), value: item }));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError("");
          setStaffRank("staff");
        }
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
          {rank ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${field}-role`}>Role</Label>
              <input type="hidden" name="staffRank" value={staffRank} />
              <Select items={rankItems} value={staffRank} onValueChange={(value) => { if (value === "owner" || value === "staff") setStaffRank(value); }}>
                <SelectTrigger id={`${field}-role`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {staffRanks.map((item) => (
                      <SelectItem key={item} value={item}>{rankLabel(item)}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          ) : null}
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

export function InviteButtons({
  clientDescription,
  teammateDescription,
  allowTeammate = false,
}: {
  clientDescription: string;
  teammateDescription: string;
  allowTeammate?: boolean;
}) {
  return (
    <>
      <InviteDialog
        label="Invite client"
        title="Invite client"
        description={clientDescription}
        action={inviteClient}
        variant="outline"
      />
      {allowTeammate ? (
        <InviteDialog
          label="Invite teammate"
          title="Invite teammate"
          description={teammateDescription}
          action={inviteTeammate}
          rank
        />
      ) : null}
    </>
  );
}
