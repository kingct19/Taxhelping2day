"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cancelClientReturn } from "@/lib/actions";

export function CancelReturnButton({ returnId, label }: { returnId: string; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError("");
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>Cancel return</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel this return</DialogTitle>
          <DialogDescription>
            {label} leaves your list. Open it again later if you still need it. The firm can see that you cancelled it.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          action={async (formData) => {
            setPending(true);
            const result = await cancelClientReturn({ error: null }, formData);
            setPending(false);
            if (result.error) {
              setError(result.error);
              return;
            }
            setOpen(false);
            router.push("/portal/documents");
          }}
        >
          <input type="hidden" name="returnId" value={returnId} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" size="sm" variant="destructive" disabled={pending}>
              {pending ? "Cancelling…" : "Cancel return"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
