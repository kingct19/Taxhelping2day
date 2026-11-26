import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTaxReturn } from "@/lib/actions";
import { partitionReturns, returnTitle } from "@/lib/client-file";
import { filingPlace, filingStatusLabel } from "@/lib/next-action";
import { returnFieldClass, shortDate } from "@/lib/return-progress";
import { stages, type TeamReturn } from "@/lib/return-workflow";
import { type FilingRecord, type FilingStatus, type TaxpayerType } from "@/lib/types";

function filingBadgeVariant(status: FilingStatus): "success" | "destructive" | "info" | "warning" | "neutral" {
  switch (status) {
    case "accepted":
      return "success";
    case "rejected":
      return "destructive";
    case "transmitted":
      return "info";
    case "signature":
    case "changes":
      return "warning";
    case "draft":
      return "neutral";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function jurisdictionOrder(record: FilingRecord): number {
  switch (record.jurisdiction) {
    case "federal":
      return 0;
    case "state":
      return 1;
    default: {
      const exhaustive: never = record.jurisdiction;
      return exhaustive;
    }
  }
}

function filingsFor(returnId: string, filings: FilingRecord[]): FilingRecord[] {
  return filings
    .filter((item) => item.returnId === returnId)
    .sort((a, b) => jurisdictionOrder(a) - jurisdictionOrder(b) || a.region.localeCompare(b.region));
}

function ReturnLink({ item }: { item: TeamReturn }) {
  return (
    <Button nativeButton={false} size="sm" className="shrink-0" render={<Link href={`/returns/${item.profileId}/${item.id}`} />}>
      Open
    </Button>
  );
}

export function ClientReturns({
  profileId,
  taxpayerType,
  returns,
  filings,
  labels,
}: {
  profileId: string;
  taxpayerType: TaxpayerType;
  returns: TeamReturn[];
  filings: FilingRecord[];
  labels: Record<string, string>;
}) {
  const { open, filed } = partitionReturns(returns);

  return (
    <div className="grid gap-3">
      <section className="grid content-start gap-2 rounded-lg border p-3">
        <h2 className="text-sm font-medium">Open returns</h2>
        {open.length === 0 ? <p className="text-sm text-muted-foreground">No open returns.</p> : (
          <ul className="grid gap-2">
            {open.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium">{returnTitle(item, labels)}</p>
                  <p className="truncate text-sm text-muted-foreground">{item.entity}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant="neutral">{stages[item.stage]}</Badge>
                  <ReturnLink item={item} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="grid content-start gap-2 rounded-lg border p-3">
        <h2 className="text-sm font-medium">Filed years</h2>
        {filed.length === 0 ? <p className="text-sm text-muted-foreground">No filed years yet.</p> : (
          <ul className="grid gap-2">
            {filed.map((item) => {
              const rows = filingsFor(item.id, filings);
              const meta = [stages[item.stage], item.deliveredAt ? shortDate(item.deliveredAt) : "", item.archivedAt ? "Archived" : ""]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={item.id} className="grid gap-2 rounded-lg border px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{returnTitle(item, labels)}</p>
                      <p className="truncate text-sm text-muted-foreground">{item.entity}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm text-muted-foreground">{meta}</span>
                      <ReturnLink item={item} />
                    </div>
                  </div>
                  {rows.length === 0 ? <p className="text-sm text-muted-foreground">No filing status recorded.</p> : (
                    <ul className="grid gap-1 border-t pt-2">
                      {rows.map((row) => (
                        <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                          <span>{filingPlace(row)}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-muted-foreground">{shortDate(row.updatedAt)}</span>
                            <Badge variant={filingBadgeVariant(row.status)}>{filingStatusLabel(row.status)}</Badge>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer text-sm font-medium">Open a tax return</summary>
        <form action={createTaxReturn.bind(null, profileId)} className="mt-3 grid gap-3 text-sm">
          <label className="grid gap-1">
            Taxpayer or entity name
            <Input name="entity" maxLength={150} required />
          </label>
          <label className="grid gap-1">
            Tax year
            <Input name="year" type="number" min={1900} max={9999} required />
          </label>
          <label className="grid gap-1">
            Return type
            <select name="type" className={returnFieldClass} defaultValue={taxpayerType}>
              <option value="individual">Individual</option>
              <option value="business">Business</option>
              <option value="nonprofit">Nonprofit</option>
            </select>
          </label>
          <Button type="submit" className="w-fit">Open return</Button>
        </form>
      </details>
    </div>
  );
}
