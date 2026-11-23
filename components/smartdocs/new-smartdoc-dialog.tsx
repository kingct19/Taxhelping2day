"use client";

import { useState } from "react";
import { createSmartdoc } from "@/lib/signing-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewSmartdocDialog({ disabled }: { disabled: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button disabled={disabled}>New smartdoc</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New document</DialogTitle>
          <DialogDescription>Name it, then upload the PDF and place fields in the builder.</DialogDescription>
        </DialogHeader>
        <form action={createSmartdoc} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="smartdoc-name">Name</Label>
            <Input id="smartdoc-name" name="name" required maxLength={120} placeholder="Engagement letter" />
          </div>
          <Button type="submit" className="w-fit">Continue</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
