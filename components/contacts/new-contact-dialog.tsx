"use client";

import { PlusIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function NewContactDialog({ children }: { children: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="lg" />}>
        <PlusIcon />
        <span className="max-sm:hidden">Invite client</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite client</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
