"use client";

import { useState, useTransition } from "react";
import { RequirementCards } from "@/components/portal/requirement-cards";
import { chooseFilingType } from "@/lib/actions";
import type { RequirementCardModel } from "@/lib/client-home";
import { taxFormFor, taxpayerTypeLabel, taxpayerTypes } from "@/lib/types";
import { cn } from "@/lib/utils";

const builtinOptions = taxpayerTypes.map((id) => ({ id, label: taxpayerTypeLabel(id), form: taxFormFor(id) }));

export function FilingTypeForm({
  returnId,
  selected,
  options = builtinOptions,
  sections = [],
  extras = [],
}: {
  returnId?: string;
  selected: readonly string[];
  options?: { id: string; label: string; form: string }[];
  sections?: { id: string; label: string; form: string; cards: RequirementCardModel[] }[];
  extras?: RequirementCardModel[];
}) {
  const order = options.map((option) => option.id);
  const [picked, setPicked] = useState<string[]>(order.filter((id) => selected.includes(id)));
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(id: string) {
    const next = order.filter((item) => (item === id ? !picked.includes(item) : picked.includes(item)));
    setPicked(next);
    const data = new FormData();
    if (returnId) data.set("returnId", returnId);
    for (const item of next) data.append("taxpayerType", item);
    startTransition(async () => {
      const result = await chooseFilingType({ error: null }, data);
      setError(result.error);
    });
  }

  return (
    <div className="grid gap-4">
      <div role="group" aria-label="Filing types" className="grid gap-3 rounded-xl border bg-card p-4">
        <div className="grid gap-1">
          <h2 className="text-sm font-medium">Filing types</h2>
          <p className="text-sm text-muted-foreground">Check every return you are filing. Each one keeps its own document list.</p>
        </div>
        {options.map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={picked.includes(option.id)} onChange={() => toggle(option.id)} />
            {option.label} · Form {option.form}
          </label>
        ))}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      </div>
      {sections.map((section) => {
        const open = picked.includes(section.id);
        return (
          <section
            key={section.id}
            aria-hidden={!open}
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
              open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="grid gap-2 px-px py-1">
                <h2 className="font-serif text-2xl">{section.label} · Form {section.form}</h2>
                <RequirementCards cards={section.cards} />
              </div>
            </div>
          </section>
        );
      })}
      {extras.length > 0 ? (
        <div className="grid gap-2">
          <h2 className="font-serif text-2xl">Requested by the firm</h2>
          <RequirementCards cards={extras} />
        </div>
      ) : null}
    </div>
  );
}
