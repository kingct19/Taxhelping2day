"use client";

import { useState } from "react";
import { sendSmartdoc } from "@/lib/signing-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SmartdocRecipient = {
  id: string;
  label: string;
  returns: { id: string; label: string }[];
};

export function SendSmartdocDialog({
  templateId,
  templateName,
  saved,
  clients,
  open: openProp,
  onOpenChange,
}: {
  templateId: string;
  templateName: string;
  saved: boolean;
  clients: SmartdocRecipient[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const ready = clients.filter((client) => client.returns.length > 0);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  function setOpen(next: boolean) {
    onOpenChange?.(next);
    if (openProp === undefined) setUncontrolledOpen(next);
  }
  const [profileId, setProfileId] = useState(ready[0]?.id ?? "");
  const [returnId, setReturnId] = useState(ready[0]?.returns[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = ready.find((client) => client.id === profileId) ?? ready[0];
  const contactItems = ready.map((client) => ({ label: client.label, value: client.id }));
  const returnItems = (selected?.returns ?? []).map((item) => ({ label: item.label, value: item.id }));

  function chooseClient(value: string) {
    setProfileId(value);
    const next = ready.find((client) => client.id === value);
    setReturnId(next?.returns[0]?.id ?? "");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {openProp === undefined ? <DialogTrigger render={<Button type="button" size="sm" variant="outline">Send</Button>} /> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send {templateName}</DialogTitle>
          <DialogDescription>DocuSeal emails the client. The signed copy stays on the return you pick.</DialogDescription>
        </DialogHeader>
        {!saved ? <p className="text-sm text-muted-foreground">Save the document in the builder before sending it.</p> : null}
        {saved && ready.length === 0 ? <p className="text-sm text-muted-foreground">Open a return before sending a document.</p> : null}
        {saved && ready.length > 0 ? (
          <form
            className="grid gap-4"
            action={async (formData) => {
              setError(null);
              setPending(true);
              try {
                const result = await sendSmartdoc(templateId, formData);
                if (result.error) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
              } catch (caught) {
                setError(caught instanceof Error && caught.message ? caught.message : "Could not send the document.");
              } finally {
                setPending(false);
              }
            }}
          >
            <input type="hidden" name="profileId" value={profileId} />
            <input type="hidden" name="returnId" value={returnId} />
            <div className="grid gap-2">
              <Label htmlFor={`send-client-${templateId}`}>Client</Label>
              <Select items={contactItems} value={profileId} onValueChange={(value) => { if (value) chooseClient(value); }}>
                <SelectTrigger id={`send-client-${templateId}`} className="w-full">
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {contactItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`send-return-${templateId}`}>Return</Label>
              <Select items={returnItems} value={returnId} onValueChange={(value) => { if (value) setReturnId(value); }}>
                <SelectTrigger id={`send-return-${templateId}`} className="w-full">
                  <SelectValue placeholder="Return" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {returnItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-fit" disabled={pending || !profileId || !returnId}>Send email</Button>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
