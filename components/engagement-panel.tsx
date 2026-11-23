import { advanceEngagement, openNextYear, saveEngagementFacts, saveInvoiceRecord, sendBackEngagement, sendOrganizer } from "@/lib/actions";
import { advanceBlocker, missingOrganizer, sendBackBlocker } from "@/lib/engagement";
import { nextStage, sendBackTarget, serviceLabel, sourceLabel, stageOrder, stages, type TeamReturn } from "@/lib/return-workflow";
import type { RequestThread } from "@/lib/request-thread";
import { invoiceStatuses, leadSources, serviceLines, type EfileAuthorization, type FilingRecord, type Invoice, type InvoiceStatus, type Profile, type SignatureRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const selectStyle = "h-8 w-full rounded-lg border bg-background px-2 text-sm";

function invoiceLabel(status: InvoiceStatus): string {
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

function dollars(cents: number) {
  const whole = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}

export function EngagementPanel({
  item,
  profile,
  signatures,
  threads,
  authorizations,
  invoice,
  filings,
}: {
  item: TeamReturn;
  profile: Profile;
  signatures: SignatureRecord[];
  threads: RequestThread[];
  authorizations: EfileAuthorization[];
  invoice: Invoice | null;
  filings: FilingRecord[];
}) {
  const upcoming = nextStage(item.stage);
  const reviewNote = item.stage === "review" ? "Reviewed." : "";
  const blocker = advanceBlocker({ workflow: item, profile, signatures, threads, authorizations, invoice, filings, note: reviewNote });
  const back = sendBackTarget(item.stage);
  const backBlock = sendBackBlocker(item.stage, filings);
  const organizerGaps = item.stage === "documents" ? missingOrganizer(profile.taxpayerType, threads) : [];
  const facts = saveEngagementFacts.bind(null, item.id, item.revision);
  const advance = advanceEngagement.bind(null, item.id, item.revision);
  const sendBack = sendBackEngagement.bind(null, item.id, item.revision);

  return (
    <section className="grid gap-4 rounded-lg border p-4">
      <div>
        <h2 className="text-sm font-medium">Engagement</h2>
        <p className="mt-1 text-sm text-muted-foreground">The file moves one stage at a time, after the work for this stage is done.</p>
      </div>
      <ol className="flex flex-wrap gap-2">
        {stageOrder.map((stage, index) => (
          <li key={stage} className={stage === item.stage ? "text-sm font-medium" : "text-sm text-muted-foreground"}>
            {index + 1}. {stages[stage]}
          </li>
        ))}
      </ol>
      {item.waitingOn ? (
        <p className="text-sm text-muted-foreground">
          {item.waitingOn === "client" ? "Waiting on the client." : "Waiting on the firm."} The stage stays here until that clears.
        </p>
      ) : null}
      <form action={facts} className="grid gap-3 text-sm">
        <label className="grid gap-1">
          How they arrived
          <select className={selectStyle} name="source" defaultValue={item.source}>
            {leadSources.map((source) => (
              <option key={source} value={source}>{sourceLabel(source)}</option>
            ))}
          </select>
        </label>
        <fieldset className="grid gap-2">
          <legend>Services</legend>
          {serviceLines.map((line) => (
            <label key={line} className="flex items-center gap-2">
              <input type="checkbox" name="services" value={line} defaultChecked={item.services.includes(line)} />
              {serviceLabel(line)}
            </label>
          ))}
        </fieldset>
        <Button className="w-fit" type="submit" variant="outline" size="sm">Save services</Button>
      </form>
      <form action={saveInvoiceRecord.bind(null, item.profileId, item.id)} className="grid gap-3 border-t pt-4 text-sm">
        <h3 className="font-medium">Invoice</h3>
        <label className="grid gap-1">
          Fee
          <Input name="amount" inputMode="decimal" defaultValue={invoice ? dollars(invoice.amountCents) : ""} placeholder="0.00" required />
        </label>
        <label className="grid gap-1">
          Status
          <select className={selectStyle} name="status" defaultValue={invoice?.status ?? "draft"}>
            {invoiceStatuses.map((status) => (
              <option key={status} value={status}>{invoiceLabel(status)}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          Payment instructions
          <Textarea name="instructions" maxLength={1000} defaultValue={invoice?.instructions ?? ""} placeholder="How the client should pay." />
        </label>
        <Button className="w-fit" type="submit" variant="outline" size="sm">Save invoice</Button>
      </form>
      {organizerGaps.length > 0 ? (
        <form action={sendOrganizer.bind(null, item.profileId, item.id)} className="grid gap-2 border-t pt-4">
          <p className="text-sm text-muted-foreground">The organizer still needs {organizerGaps.join(", ")}.</p>
          <Button className="w-fit" type="submit" variant="outline" size="sm">Send organizer</Button>
        </form>
      ) : null}
      {upcoming && item.stage !== "renewal" ? (
        blocker && item.stage !== "review" ? (
          <p className="border-t pt-4 text-sm text-muted-foreground">{blocker}</p>
        ) : (
          <form action={advance} className="grid gap-2 border-t pt-4">
            {item.stage === "review" ? (
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
            <Button className="w-fit" type="submit" size="sm">
              {item.stage === "delivery" ? "Deliver, archive, and move to year-round" : `Move to ${stages[upcoming]}`}
            </Button>
          </form>
        )
      ) : null}
      {back ? (
        backBlock ? (
          <p className="text-sm text-muted-foreground">{backBlock}</p>
        ) : (
          <form action={sendBack} className="grid gap-2">
            <label className="grid gap-1 text-sm">
              Send back to {stages[back]}
              <Input name="reason" required maxLength={500} placeholder="What has to change?" />
            </label>
            <Button className="w-fit" type="submit" variant="outline" size="sm">Send back</Button>
          </form>
        )
      ) : null}
      {item.stage === "renewal" ? (
        <form action={openNextYear.bind(null, item.profileId, item.id)}>
          <Button className="w-fit" type="submit" size="sm">Open next tax year</Button>
        </form>
      ) : null}
      {item.reviewedAt ? (
        <p className="text-xs text-muted-foreground">Reviewer approved {item.reviewedAt.slice(0, 10)}.</p>
      ) : null}
      {item.archivedAt ? (
        <p className="text-xs text-muted-foreground">Archived {item.archivedAt.slice(0, 10)}.</p>
      ) : null}
    </section>
  );
}
