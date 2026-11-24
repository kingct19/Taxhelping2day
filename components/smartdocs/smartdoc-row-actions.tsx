"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { EllipsisVerticalIcon } from "lucide-react";
import { SendSmartdocDialog, type SmartdocRecipient } from "@/components/smartdocs/send-smartdoc-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setEngagementTemplate, setSmartdocArchived } from "@/lib/signing-actions";

export function SmartdocRowActions({
  id,
  name,
  archived,
  saved,
  engagement,
  clients,
}: {
  id: string;
  name: string;
  archived: boolean;
  saved: boolean;
  engagement: boolean;
  clients: SmartdocRecipient[];
}) {
  const [sendOpen, setSendOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" aria-label={`Actions for ${name}`} aria-busy={pending || undefined} disabled={pending} />}>
          {pending ? <Spinner /> : <EllipsisVerticalIcon />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuItem nativeButton={false} render={<Link href={`/smartdocs/${id}`} />}>
              Edit
            </DropdownMenuItem>
            {archived ? null : (
              <DropdownMenuItem
                onClick={() => {
                  window.setTimeout(() => setSendOpen(true), 0);
                }}
              >
                Send
              </DropdownMenuItem>
            )}
            {saved && !archived && !engagement ? (
              <DropdownMenuItem
                onClick={() => {
                  startTransition(() => {
                    void setEngagementTemplate(id);
                  });
                }}
              >
                Use as engagement letter
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem nativeButton={false} render={<Link href={`/smartdocs/${id}/completions`} />}>
              Show completions
            </DropdownMenuItem>
            <DropdownMenuItem
              variant={archived ? "default" : "destructive"}
              onClick={() => {
                startTransition(() => {
                  void setSmartdocArchived(id, !archived);
                });
              }}
            >
              {archived ? "Restore" : "Archive"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {archived ? null : (
        <SendSmartdocDialog
          templateId={id}
          templateName={name}
          saved={saved}
          clients={clients}
          open={sendOpen}
          onOpenChange={setSendOpen}
        />
      )}
    </div>
  );
}
