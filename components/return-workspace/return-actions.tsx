"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveEngagementFacts, saveInvoiceRecord } from "@/lib/actions";
import { formatDollars, returnFieldClass } from "@/lib/return-progress";
import { serviceLabel, sourceLabel } from "@/lib/return-workflow";
import { invoiceStatuses, leadSources, serviceLines, type InvoiceStatus, type LeadSource, type ServiceLine } from "@/lib/types";

type Person = { id: string; name: string };
type FormAction = (data: FormData) => Promise<void>;

function invoiceStatusLabel(status: InvoiceStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "sent":
      return "Sent";
    case "paid":
      return "Paid";
    case "waived":
      return "Waived";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function ReturnActions({
  assignAction,
  advanceAction,
  advanceLabel,
  advanceNeedsNote,
  sendBackAction,
  sendBackLabel,
  openYearAction,
  contactHref,
  teammates,
  owner,
  due,
  nextAction,
  profileId,
  returnId,
  revision,
  source,
  services,
  invoice,
}: {
  assignAction: FormAction;
  advanceAction: FormAction | null;
  advanceLabel: string | null;
  advanceNeedsNote: boolean;
  sendBackAction: FormAction | null;
  sendBackLabel: string | null;
  openYearAction: FormAction | null;
  contactHref: string;
  teammates: Person[];
  owner: string;
  due: string;
  nextAction: string;
  profileId: string;
  returnId: string;
  revision: number;
  source: LeadSource;
  services: ServiceLine[];
  invoice: { amountCents: number; status: InvoiceStatus; instructions: string } | null;
}) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [backOpen, setBackOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" />}>
          Actions
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setAssignOpen(true)}>Assign return</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setBillingOpen(true)}>Billing and services</DropdownMenuItem>
            {advanceAction && advanceLabel ? (
              <DropdownMenuItem onClick={() => setAdvanceOpen(true)}>{advanceLabel}</DropdownMenuItem>
            ) : null}
            {sendBackAction && sendBackLabel ? (
              <DropdownMenuItem onClick={() => setBackOpen(true)}>{sendBackLabel}</DropdownMenuItem>
            ) : null}
            {openYearAction ? (
              <DropdownMenuItem onClick={() => setYearOpen(true)}>Open next tax year</DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem nativeButton={false} render={<Link href={contactHref} />}>
            Open customer file
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign this return</DialogTitle>
            <DialogDescription>Who is preparing it, and when it is due.</DialogDescription>
          </DialogHeader>
          <form action={assignAction} className="grid gap-3">
            <label className="grid gap-1 text-sm">
              Preparer
              <select className={returnFieldClass} name="owner" defaultValue={owner}>
                <option value="">Unassigned</option>
                {teammates.map((person) => (
                  <option key={person.id} value={person.id}>{person.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Due date
              <Input type="date" name="due" defaultValue={due} />
            </label>
            <label className="grid gap-1 text-sm">
              Note for the team
              <Input name="nextAction" maxLength={500} defaultValue={nextAction} placeholder="What should the next preparer know?" />
            </label>
            <DialogFooter>
              <Button type="submit" size="sm">Save assignment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {advanceAction && advanceLabel ? (
        <Dialog open={advanceOpen} onOpenChange={setAdvanceOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{advanceLabel}</DialogTitle>
              <DialogDescription>The file moves one stage at a time, after the work for this stage is done.</DialogDescription>
            </DialogHeader>
            <form action={advanceAction} className="grid gap-3">
              {advanceNeedsNote ? (
                <label className="grid gap-1 text-sm">
                  Reviewer note
                  <Textarea name="note" required maxLength={500} placeholder="What did the review confirm?" />
                </label>
              ) : (
                <label className="grid gap-1 text-sm">
                  Note for the team
                  <Input name="note" maxLength={500} placeholder="Optional" />
                </label>
              )}
              <DialogFooter>
                <Button type="submit" size="sm">{advanceLabel}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      {sendBackAction && sendBackLabel ? (
        <Dialog open={backOpen} onOpenChange={setBackOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{sendBackLabel}</DialogTitle>
              <DialogDescription>Say what has to change before the file can move forward again.</DialogDescription>
            </DialogHeader>
            <form action={sendBackAction} className="grid gap-3">
              <label className="grid gap-1 text-sm">
                What has to change
                <Input name="reason" required maxLength={500} placeholder="What has to change?" />
              </label>
              <DialogFooter>
                <Button type="submit" size="sm" variant="outline">{sendBackLabel}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      <Dialog open={billingOpen} onOpenChange={setBillingOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Billing and services</DialogTitle>
            <DialogDescription>The fee has to be sent, paid, or waived before the return can be filed.</DialogDescription>
          </DialogHeader>
          <form action={saveEngagementFacts.bind(null, returnId, revision)} className="grid gap-2 text-sm">
            <label className="grid gap-1">
              How they arrived
              <select className={returnFieldClass} name="source" defaultValue={source}>
                {leadSources.map((item) => (
                  <option key={item} value={item}>{sourceLabel(item)}</option>
                ))}
              </select>
            </label>
            <fieldset className="flex flex-wrap gap-x-3 gap-y-1">
              <legend className="sr-only">Services</legend>
              {serviceLines.map((line) => (
                <label key={line} className="flex items-center gap-1.5">
                  <input type="checkbox" name="services" value={line} defaultChecked={services.includes(line)} />
                  {serviceLabel(line)}
                </label>
              ))}
            </fieldset>
            <Button type="submit" variant="outline" size="sm" className="w-fit">Save services</Button>
          </form>
          <form action={saveInvoiceRecord.bind(null, profileId, returnId)} className="grid gap-2 border-t pt-3 text-sm">
            <label className="grid gap-1">
              Fee
              <Input name="amount" inputMode="decimal" defaultValue={invoice ? formatDollars(invoice.amountCents) : ""} placeholder="0.00" required />
            </label>
            <label className="grid gap-1">
              Invoice status
              <select className={returnFieldClass} name="status" defaultValue={invoice?.status ?? "draft"}>
                {invoiceStatuses.map((status) => (
                  <option key={status} value={status}>{invoiceStatusLabel(status)}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              Payment instructions
              <Textarea name="instructions" maxLength={1000} defaultValue={invoice?.instructions ?? ""} placeholder="How the client should pay." rows={2} />
            </label>
            <DialogFooter>
              <Button type="submit" variant="outline" size="sm">Save invoice</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {openYearAction ? (
        <Dialog open={yearOpen} onOpenChange={setYearOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Open next tax year</DialogTitle>
              <DialogDescription>This opens the next year for the same taxpayer. It does not change this return.</DialogDescription>
            </DialogHeader>
            <form action={openYearAction}>
              <DialogFooter>
                <Button type="submit" size="sm">Open next tax year</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
