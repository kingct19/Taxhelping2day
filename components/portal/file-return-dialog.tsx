"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { addYearFilingType } from "@/lib/actions";
import { returnFieldClass } from "@/lib/return-progress";

export type FileReturnType = {
  id: string;
  label: string;
  form: string;
};

export function FileReturnDialog({
  years,
  types,
  taken,
  defaultYear,
}: {
  years: number[];
  types: FileReturnType[];
  taken: { year: number; typeId: string }[];
  defaultYear: number;
}) {
  const initialYear = (years.includes(defaultYear) && types.some((type) => !taken.some((row) => row.year === defaultYear && row.typeId === type.id))
    ? defaultYear
    : years.find((option) => types.some((type) => !taken.some((row) => row.year === option && row.typeId === type.id)))) ?? years[0] ?? defaultYear;
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(initialYear);
  const [typeId, setTypeId] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const available = types.filter((type) => !taken.some((row) => row.year === year && row.typeId === type.id));
  const selected = available.some((type) => type.id === typeId) ? typeId : available[0]?.id ?? "";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError("");
          setYear(initialYear);
          setTypeId("");
        }
      }}
    >
      <DialogTrigger render={<Button type="button" />}>File a new return</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>File a new return</DialogTitle>
          <DialogDescription>Choose the tax year and the kind of return. That return gets its own document list.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          action={async (formData) => {
            setPending(true);
            const result = await addYearFilingType({ error: null }, formData);
            setPending(false);
            if (result.error) {
              setError(result.error);
              return;
            }
            setError("");
            setOpen(false);
          }}
        >
          <label className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">Tax year</span>
            <select
              className={returnFieldClass}
              name="year"
              value={year}
              onChange={(event) => {
                setYear(Number(event.target.value));
                setError("");
              }}
            >
              {years.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">Return type</span>
            <select
              className={returnFieldClass}
              name="filingTypeId"
              value={selected}
              disabled={available.length === 0}
              onChange={(event) => {
                setTypeId(event.target.value);
                setError("");
              }}
            >
              {available.length === 0 ? <option value="">No types left for this year</option> : null}
              {available.map((type) => (
                <option key={type.id} value={type.id}>{type.label} · Form {type.form}</option>
              ))}
            </select>
          </label>
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every return type is already open for {year}. Choose another year.</p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" size="sm" disabled={pending || available.length === 0 || !selected}>
              {pending ? "Opening…" : "Open return"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
