import Link from "next/link";
import { LiniqoEmpty, liniqo } from "@/components/liniqo-empty";
import { taxpayerTypeLabel, type TaxReturn } from "@/lib/types";

export function TaxReturnList({ returns, labels = {} }: { returns: TaxReturn[]; labels?: Record<string, string> }) {
  return (
    <section className="grid gap-2">
      <div>
        <h2 className="font-medium">Tax returns</h2>
        <p className="text-sm text-muted-foreground">Open a year to review documents, ask for what is missing, and record the filing.</p>
      </div>
      {returns.length === 0 ? <LiniqoEmpty {...liniqo.taxForm} className="px-0 py-4">No returns opened yet.</LiniqoEmpty> : null}
      <ul className="grid gap-2">
        {returns.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
            <div>
              <p className="font-medium">{item.taxYear} {(labels[item.filingTypeId || item.taxpayerType] ?? taxpayerTypeLabel(item.taxpayerType)).toLowerCase()} return</p>
              <p className="text-sm text-muted-foreground">{item.entity}</p>
            </div>
            <Link href={`/returns/${item.profileId}/${item.id}`} className="text-sm underline">
              Open return
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
