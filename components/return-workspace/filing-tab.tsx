import { FilingLedger } from "@/components/filing-ledger";
import { StageMoveForm } from "@/components/return-workspace/stage-move-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendBackBlocker, type GateInput } from "@/lib/engagement";
import { advanceOffer, blockerLines, sendBackOffer } from "@/lib/return-progress";
import { stages } from "@/lib/return-workflow";
import { taxpayerTypeLabel, type FilingRecord, type Invoice } from "@/lib/types";

export function FilingTab({
  profileId,
  returnId,
  gate,
  filings,
  invoice,
  preparer,
  advanceAction,
  sendBackAction,
  openYearAction,
}: {
  profileId: string;
  returnId: string;
  gate: GateInput;
  filings: FilingRecord[];
  invoice: Invoice | null;
  preparer: string;
  advanceAction: (data: FormData) => Promise<void>;
  sendBackAction: (data: FormData) => Promise<void>;
  openYearAction: (() => Promise<void>) | null;
}) {
  const stage = gate.workflow.stage;
  const offer = stage === "filing" || stage === "delivery" ? advanceOffer(gate) : null;
  const back = stage === "filing" ? sendBackOffer(gate) : null;
  const backBlock = stage === "filing" ? sendBackBlocker(stage, filings) : null;
  const accepted = filings.some((item) => item.status === "accepted");
  const instructions = Boolean(invoice && (invoice.status === "waived" || invoice.instructions.trim()));
  const closeout = [
    { label: "Accepted acknowledgement recorded", done: accepted },
    { label: "Payment instructions, or the fee waived", done: instructions },
    { label: "Return delivered", done: Boolean(gate.workflow.deliveredAt) },
  ];

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_20rem]">
      <div className="grid gap-3">
        <FilingLedger
          profileId={profileId}
          returnId={returnId}
          filings={filings}
          taxYear={gate.workflow.taxYear}
          returnVersion={gate.workflow.returnVersion}
          returnType={taxpayerTypeLabel(gate.profile.taxpayerType)}
          softwareReference={gate.workflow.desk.softwareReference}
          preparer={preparer}
        />
      </div>
      <aside className="grid content-start gap-3">
        <section className="grid gap-3 rounded-lg border p-3">
          <div>
            <h2 className="text-sm font-medium">Delivery</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">The client handoff. It waits for an accepted acknowledgement.</p>
          </div>
          <ul className="grid">
            {closeout.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-3 border-t py-2 first:border-t-0 first:pt-0">
                <span className="text-sm">{item.label}</span>
                <Badge variant={item.done ? "success" : "neutral"}>{item.done ? "Done" : "Open"}</Badge>
              </li>
            ))}
          </ul>
          {offer ? <StageMoveForm action={advanceAction} needsNote={offer.needsNote} label={offer.label} /> : null}
          {(stage === "filing" || stage === "delivery") && !offer ? (
            <p className="text-sm text-muted-foreground">{blockerLines(gate)[0] ?? `This return is in ${stages[stage].toLowerCase()}.`}</p>
          ) : null}
          {stage === "renewal" && openYearAction ? (
            <form action={openYearAction}>
              <Button type="submit" size="sm">Open next tax year</Button>
            </form>
          ) : null}
        </section>
        {stage === "filing" ? (
          <section className="grid gap-3 rounded-lg border p-3">
            <div>
              <h2 className="text-sm font-medium">Resubmit</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Record the rejection, then send the file back to preparation.</p>
            </div>
            {back ? (
              <form action={sendBackAction} className="grid gap-3">
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-muted-foreground">What has to change</span>
                  <Input name="reason" required maxLength={500} placeholder="What has to change?" />
                </label>
                <Button type="submit" size="sm" className="w-fit">{back.label}</Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">{backBlock ?? "This return cannot be sent back from filing."}</p>
            )}
          </section>
        ) : null}
      </aside>
    </div>
  );
}
