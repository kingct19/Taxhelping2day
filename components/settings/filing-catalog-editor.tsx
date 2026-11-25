"use client";

import { useState, useTransition } from "react";
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { saveFilingCatalog } from "@/lib/actions";
import { filingTypeSlug, type CatalogDocument, type CatalogType, type FilingCatalog } from "@/lib/filing-catalog";
import { documentKindLabel, documentKinds, isTaxpayerType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const kindOptions = documentKinds.map((kind) => ({ value: kind, label: documentKindLabel(kind) }));

export function FilingCatalogEditor({ catalog, usedIds }: { catalog: FilingCatalog; usedIds: string[] }) {
  const [types, setTypes] = useState<CatalogType[]>(catalog.types);
  const [baseline, setBaseline] = useState(catalog.types);
  const [selectedId, setSelectedId] = useState(catalog.types.find((type) => !type.retired)?.id ?? catalog.types[0]?.id ?? "");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [form, setForm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(types) !== JSON.stringify(baseline);
  const selected = types.find((type) => type.id === selectedId) ?? types[0] ?? null;

  function updateType(id: string, patch: Partial<CatalogType>) {
    setSaved(false);
    setTypes((current) => current.map((type) => (type.id === id ? { ...type, ...patch } : type)));
  }

  function updateDocument(typeId: string, documentId: string, patch: Partial<CatalogDocument>) {
    setSaved(false);
    setTypes((current) => current.map((type) => type.id === typeId
      ? { ...type, documents: type.documents.map((document) => document.id === documentId ? { ...document, ...patch } : document) }
      : type));
  }

  function moveDocument(typeId: string, documentId: string, direction: -1 | 1) {
    setSaved(false);
    setTypes((current) => current.map((type) => {
      if (type.id !== typeId) return type;
      const index = type.documents.findIndex((document) => document.id === documentId);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= type.documents.length) return type;
      const documents = [...type.documents];
      const [row] = documents.splice(index, 1);
      if (!row) return type;
      documents.splice(next, 0, row);
      return { ...type, documents };
    }));
  }

  function addDocument(typeId: string) {
    setSaved(false);
    const document: CatalogDocument = {
      id: `doc-${crypto.randomUUID().slice(0, 8)}`,
      title: "",
      detail: "",
      kind: "other",
      required: true,
    };
    setTypes((current) => current.map((type) => type.id === typeId ? { ...type, documents: [...type.documents, document] } : type));
  }

  function removeDocument(typeId: string, documentId: string) {
    setSaved(false);
    setTypes((current) => current.map((type) => type.id === typeId
      ? { ...type, documents: type.documents.filter((document) => document.id !== documentId) }
      : type));
  }

  function addType() {
    const label = name.trim();
    const formName = form.trim();
    if (!label || !formName) {
      setError("Enter a name and a form, such as S corporation and 1120-S.");
      return;
    }
    const id = filingTypeSlug(label, types.map((type) => type.id));
    setTypes((current) => [...current, { id, label, form: formName, retired: false, documents: [] }]);
    setSelectedId(id);
    setName("");
    setForm("");
    setAdding(false);
    setError(null);
    setSaved(false);
  }

  function removeType(type: CatalogType) {
    setSaved(false);
    if (isTaxpayerType(type.id) || usedIds.includes(type.id)) {
      updateType(type.id, { retired: !type.retired });
      return;
    }
    setTypes((current) => current.filter((item) => item.id !== type.id));
    setSelectedId((current) => current === type.id ? types.find((item) => item.id !== type.id)?.id ?? "" : current);
  }

  function save() {
    if (types.some((type) => !type.label.trim() || !type.form.trim())) {
      setError("Every filing type needs a name and a form.");
      setSaved(false);
      return;
    }
    if (types.some((type) => type.documents.some((document) => !document.title.trim()))) {
      setError("Every document needs a name before you save.");
      setSaved(false);
      return;
    }
    const data = new FormData();
    data.set("catalog", JSON.stringify({ types }));
    startTransition(async () => {
      const result = await saveFilingCatalog({ error: null }, data);
      setError(result.error);
      setSaved(result.error === null);
      if (result.error === null) setBaseline(types);
    });
  }

  return (
    <div className="grid gap-4">
      <div className={cn(
        "sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
        dirty ? "border-amber-500/40 bg-amber-500/10" : "bg-card",
      )}>
        <p className="text-sm">
          {error ? <span role="alert" className="text-destructive">{error}</span> : null}
          {!error && dirty ? "You have unsaved changes." : null}
          {!error && !dirty && saved ? "Saved. Clients see this the next time they open Documents." : null}
          {!error && !dirty && !saved ? "Pick a return, then edit the documents a client uploads for it." : null}
        </p>
        <Button type="button" onClick={save} disabled={pending || !dirty}>{pending ? "Saving" : "Save changes"}</Button>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="grid gap-2 rounded-xl border bg-card p-2">
          <p className="px-2 pt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Returns</p>
          <div className="grid gap-1">
            {types.map((type) => {
              const required = type.documents.filter((document) => document.required).length;
              const active = type.id === selected?.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedId(type.id)}
                  className={cn(
                    "grid gap-0.5 rounded-lg px-3 py-2 text-left transition-colors",
                    active ? "bg-secondary" : "hover:bg-muted",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{type.label}</span>
                    {type.retired ? <Badge variant="neutral">Retired</Badge> : null}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Form {type.form} · {required} required
                  </span>
                </button>
              );
            })}
          </div>
          {adding ? (
            <div className="grid gap-2 rounded-lg border border-dashed p-3">
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="S corporation" aria-label="Filing type name" />
              <Input value={form} onChange={(event) => setForm(event.target.value)} placeholder="1120-S" aria-label="Form number" />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={addType}>Add</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setAdding(false); setError(null); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="ghost" className="justify-start" onClick={() => setAdding(true)}>
              <PlusIcon />
              Add a filing type
            </Button>
          )}
        </aside>

        {selected ? (
          <section className="grid gap-4">
            <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                <label className="grid gap-1.5 text-sm">
                  <span className="text-xs text-muted-foreground">Name clients see</span>
                  <Input value={selected.label} onChange={(event) => updateType(selected.id, { label: event.target.value })} />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="text-xs text-muted-foreground">Form</span>
                  <Input value={selected.form} onChange={(event) => updateType(selected.id, { form: event.target.value })} />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Choice
                  value={selected.retired ? "retired" : "shown"}
                  options={[
                    { value: "shown", label: "Shown" },
                    { value: "retired", label: "Retired" },
                  ]}
                  onChange={(value) => updateType(selected.id, { retired: value === "retired" })}
                />
                {isTaxpayerType(selected.id) || usedIds.includes(selected.id) ? null : (
                  <Button type="button" variant="ghost" size="icon" aria-label="Delete this filing type" onClick={() => removeType(selected)}>
                    <Trash2Icon />
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground sm:col-span-2">
                {selected.retired
                  ? "Hidden from new clients. A return already using it keeps this list."
                  : "Clients can check this return. Its documents appear on their own."}
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div>
                  <h2 className="text-sm font-medium">Documents</h2>
                  <p className="text-xs text-muted-foreground">Required items hold the return until the firm accepts or waives them.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => addDocument(selected.id)}>
                  <PlusIcon />
                  Add document
                </Button>
              </div>
              {selected.documents.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">No documents yet. Add the first record a client should upload.</p>
              ) : (
                <ul>
                  {selected.documents.map((document, index) => (
                    <li key={document.id} className="grid gap-3 border-b px-3 py-3 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)]">
                      <div className="flex items-center gap-1 sm:flex-col">
                        <Button type="button" variant="ghost" size="icon-xs" aria-label="Move up" disabled={index === 0} onClick={() => moveDocument(selected.id, document.id, -1)}>
                          <ChevronUpIcon />
                        </Button>
                        <span className="w-4 text-center text-xs text-muted-foreground tabular-nums">{index + 1}</span>
                        <Button type="button" variant="ghost" size="icon-xs" aria-label="Move down" disabled={index === selected.documents.length - 1} onClick={() => moveDocument(selected.id, document.id, 1)}>
                          <ChevronDownIcon />
                        </Button>
                      </div>
                      <div className="grid min-w-0 gap-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <input
                            value={document.title}
                            onChange={(event) => updateDocument(selected.id, document.id, { title: event.target.value })}
                            placeholder="Document name"
                            aria-label="Document name"
                            className="min-w-48 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                          />
                          <div className="flex items-center gap-2">
                            <Choice
                              value={document.required ? "required" : "optional"}
                              options={[
                                { value: "required", label: "Required" },
                                { value: "optional", label: "Optional" },
                              ]}
                              onChange={(value) => updateDocument(selected.id, document.id, { required: value === "required" })}
                            />
                            <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove ${document.title || "document"}`} onClick={() => removeDocument(selected.id, document.id)}>
                              <Trash2Icon />
                            </Button>
                          </div>
                        </div>
                        <input
                          value={document.detail}
                          onChange={(event) => updateDocument(selected.id, document.id, { detail: event.target.value })}
                          placeholder="A short note the client sees under the name"
                          aria-label="Note the client sees"
                          className="w-full bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/70"
                        />
                        <Select
                          items={kindOptions}
                          value={document.kind}
                          onValueChange={(next) => {
                            const kind = documentKinds.find((item) => item === next);
                            if (kind) updateDocument(selected.id, document.id, { kind });
                          }}
                        >
                          <SelectTrigger size="sm" aria-label="Document kind" className="w-fit">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {kindOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function Choice({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex rounded-lg bg-muted p-0.5" role="group">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-7 rounded-md px-2.5 text-xs font-medium transition-colors",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
