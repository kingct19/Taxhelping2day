"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { saveFiling } from "@/lib/actions";
import { filingPlace } from "@/lib/next-action";
import { filingDeskLabel } from "@/lib/return-readiness";
import { returnFieldClass } from "@/lib/return-progress";
import { filingTone } from "@/lib/status-tone";
import { filingStatuses, type FilingRecord } from "@/lib/types";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <li className="grid gap-0.5 py-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </li>
  );
}

export function FilingLedger({
  profileId,
  returnId,
  filings,
  taxYear,
  returnVersion,
  returnType,
  softwareReference,
  preparer,
}: {
  profileId: string;
  returnId: string;
  filings: FilingRecord[];
  taxYear: number;
  returnVersion: number;
  returnType: string;
  softwareReference: string;
  preparer: string;
}) {
  const [editing, setEditing] = useState<FilingRecord | "new" | null>(null);
  const rows = filings
    .filter((item) => item.returnId === returnId)
    .sort((a, b) => filingPlace(a).localeCompare(filingPlace(b)));
  const current = editing === "new" ? null : editing;

  return (
    <section className="grid gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium">Filings</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">The firm’s record after tax software moves. This is not an IRS receipt.</p>
        </div>
        <Button type="button" size="sm" onClick={() => setEditing("new")}>Add a filing</Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No jurisdiction has been recorded.</p>
      ) : (
        <ul className="grid gap-2">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-3 rounded-lg border px-3 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{filingPlace(row)}</p>
                  <Badge variant={filingTone(row.status)}>{filingDeskLabel(row.status)}</Badge>
                </div>
                <ul className="mt-2 grid sm:grid-cols-2">
                  <Fact label="Return" value={`${returnType} · ${taxYear}`} />
                  <Fact label="Version" value={String(returnVersion)} />
                  <Fact label="Software reference" value={softwareReference || "None recorded"} />
                  <Fact label="Recorded" value={row.updatedAt.slice(0, 10)} />
                  <Fact label="Acknowledgement" value={row.note || "None recorded"} />
                  <Fact label="Responsible" value={preparer} />
                </ul>
              </div>
              <Button type="button" size="sm" className="shrink-0" onClick={() => setEditing(row)}>Edit</Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{current ? `Update ${filingPlace(current)}` : "Add a filing"}</DialogTitle>
            <DialogDescription>Record what tax software did. Saving this does not transmit the return.</DialogDescription>
          </DialogHeader>
          <form action={saveFiling.bind(null, profileId, returnId)} className="grid gap-3">
            {current ? (
              <>
                <input type="hidden" name="jurisdiction" value={current.jurisdiction} />
                <input type="hidden" name="region" value={current.region} />
              </>
            ) : (
              <>
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Jurisdiction</span>
                  <select className={returnFieldClass} name="jurisdiction" defaultValue="federal">
                    <option value="federal">Federal</option>
                    <option value="state">State</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-muted-foreground">State</span>
                  <Input name="region" maxLength={2} placeholder="TX — leave blank for federal" />
                </label>
              </>
            )}
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Status</span>
              <select className={returnFieldClass} name="status" defaultValue={current?.status ?? "draft"}>
                {filingStatuses.map((status) => (
                  <option key={status} value={status}>{filingDeskLabel(status)}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Acknowledgement or rejection</span>
              <Input name="note" maxLength={1000} defaultValue={current?.note ?? ""} placeholder="What the software reported" />
            </label>
            <DialogFooter>
              <Button type="submit" size="sm">{current ? "Save filing" : "Add filing"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
