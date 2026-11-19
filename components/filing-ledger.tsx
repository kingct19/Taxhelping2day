import { saveFiling } from "@/lib/actions";
import { filingPlace, filingStatusLabel } from "@/lib/next-action";
import { filingTone } from "@/lib/status-tone";
import { filingStatuses, type FilingRecord, type FilingStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const selectStyle = "h-8 w-full rounded-lg border bg-background px-2 text-sm";

function filingOrder(status: FilingStatus) {
  switch (status) {
    case "rejected":
      return 0;
    case "changes":
      return 1;
    case "signature":
      return 2;
    case "draft":
      return 3;
    case "transmitted":
      return 4;
    case "accepted":
      return 5;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function FilingLedger({ profileId, returnId, filings }: { profileId: string; returnId: string; filings: FilingRecord[] }) {
  const rows = filings
    .filter((item) => item.returnId === returnId)
    .sort((a, b) => filingOrder(a.status) - filingOrder(b.status) || filingPlace(a).localeCompare(filingPlace(b)));
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-sm font-medium">Where this return stands</h2>
        <p className="mt-1 text-sm text-muted-foreground">Change a line when the tax software moves. Add a filing if this return has another state. The IRS does not send these in.</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing has been recorded yet.</p>
      ) : (
        <ul className="grid gap-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{filingPlace(row)}</span>
                <Badge variant={filingTone(row.status)}>{filingStatusLabel(row.status)}</Badge>
              </div>
              {row.note ? <p className="mt-1 text-sm text-muted-foreground">{row.note}</p> : null}
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-muted-foreground">Change this status</summary>
                <form action={saveFiling.bind(null, profileId, returnId)} className="mt-3 grid gap-3 text-sm">
                  <input type="hidden" name="jurisdiction" value={row.jurisdiction} />
                  <input type="hidden" name="region" value={row.region} />
                  <label className="grid gap-1">
                    New status
                    <select className={selectStyle} name="status" defaultValue={row.status}>
                      {filingStatuses.map((status) => (
                        <option key={status} value={status}>{filingStatusLabel(status)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    What happened
                    <Input name="note" maxLength={1000} defaultValue={row.note} placeholder="The acknowledgement, or why it was rejected" />
                  </label>
                  <Button className="w-fit" type="submit" variant="outline" size="sm">Save {filingPlace(row)}</Button>
                </form>
              </details>
            </li>
          ))}
        </ul>
      )}
      <details className="rounded-lg border px-3 py-3" {...(rows.length === 0 ? { open: true } : {})}>
        <summary className="cursor-pointer text-sm font-medium">Add a filing</summary>
        <p className="mt-2 text-xs text-muted-foreground">Use this for a return that is not listed yet, usually another state. Saving here does not change the ones above.</p>
        <form action={saveFiling.bind(null, profileId, returnId)} className="mt-3 grid gap-3 text-sm">
          <label className="grid gap-1">
            Which return
            <select className={selectStyle} name="jurisdiction" defaultValue="federal">
              <option value="federal">Federal</option>
              <option value="state">A state</option>
            </select>
          </label>
          <label className="grid gap-1">
            State
            <Input name="region" maxLength={2} placeholder="TX — leave blank for federal" />
          </label>
          <label className="grid gap-1">
            New status
            <select className={selectStyle} name="status" defaultValue="draft">
              {filingStatuses.map((status) => (
                <option key={status} value={status}>{filingStatusLabel(status)}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            What happened
            <Input name="note" maxLength={1000} placeholder="The acknowledgement, or why it was rejected" />
          </label>
          <Button className="w-fit" type="submit" variant="outline">Save this filing</Button>
        </form>
      </details>
    </section>
  );
}
