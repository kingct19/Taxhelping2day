import { standardDocuments } from "@/lib/season";
import { documentKinds, isTaxpayerType, taxFormFor, taxpayerTypeLabel, taxpayerTypes, type DocumentKind, type TaxpayerType } from "@/lib/types";

export type CatalogDocument = {
  id: string;
  title: string;
  detail: string;
  kind: DocumentKind;
  required: boolean;
};

export type CatalogType = {
  id: string;
  label: string;
  form: string;
  retired: boolean;
  documents: CatalogDocument[];
};

export type FilingCatalog = {
  types: CatalogType[];
};

const idPattern = /^[a-z0-9-]{1,40}$/;

export function defaultFilingCatalog(): FilingCatalog {
  return {
    types: taxpayerTypes.map((id) => ({
      id,
      label: taxpayerTypeLabel(id),
      form: taxFormFor(id),
      retired: false,
      documents: standardDocuments(id).map((document, index) => ({
        id: `${id}-${index + 1}`,
        title: document.title,
        detail: document.detail,
        kind: document.kind,
        required: document.required,
      })),
    })),
  };
}

function cleanDocument(value: unknown, index: number, typeId: string): CatalogDocument | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<CatalogDocument>;
  const title = String(row.title ?? "").trim().slice(0, 120);
  if (!title) return null;
  const kind = documentKinds.find((item) => item === row.kind) ?? "other";
  const id = String(row.id ?? "").trim().toLowerCase();
  return {
    id: idPattern.test(id) ? id : `${typeId}-doc-${index + 1}`,
    title,
    detail: String(row.detail ?? "").trim().slice(0, 400),
    kind,
    required: row.required === true,
  };
}

function cleanType(value: unknown): CatalogType | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<CatalogType>;
  const id = String(row.id ?? "").trim().toLowerCase();
  const label = String(row.label ?? "").trim().slice(0, 80);
  const form = String(row.form ?? "").trim().slice(0, 20);
  if (!idPattern.test(id) || !label || !form) return null;
  const documents = Array.isArray(row.documents) ? row.documents.flatMap((document, index) => {
    const cleaned = cleanDocument(document, index, id);
    return cleaned ? [cleaned] : [];
  }).slice(0, 40) : [];
  return { id, label, form, retired: row.retired === true, documents };
}

export function parseFilingCatalog(value: unknown): FilingCatalog {
  const fallback = defaultFilingCatalog();
  const rows = value && typeof value === "object" && Array.isArray((value as FilingCatalog).types)
    ? (value as FilingCatalog).types.flatMap((row) => {
      const cleaned = cleanType(row);
      return cleaned ? [cleaned] : [];
    })
    : [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const types = fallback.types.map((row) => byId.get(row.id) ?? row);
  for (const row of rows) {
    if (!isTaxpayerType(row.id) && !types.some((item) => item.id === row.id)) types.push(row);
  }
  return { types: types.slice(0, 30) };
}

export function catalogType(catalog: FilingCatalog, id: string): CatalogType | null {
  return catalog.types.find((item) => item.id === id) ?? null;
}

export function catalogLabel(catalog: FilingCatalog, id: string): string {
  return catalog.types.find((item) => item.id === id)?.label ?? (isTaxpayerType(id) ? taxpayerTypeLabel(id) : id);
}

export function returnTaxpayerType(id: string): TaxpayerType {
  if (isTaxpayerType(id)) return id;
  return "business";
}

export function filingTypeSlug(label: string, taken: readonly string[]): string {
  const base = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
  const stem = base && !taxpayerTypes.some((item) => item === base) ? base : `custom-${base || "return"}`;
  let id = stem.slice(0, 40);
  let count = 2;
  while (taken.includes(id) || !idPattern.test(id)) {
    id = `${stem.slice(0, 34)}-${count}`.slice(0, 40);
    count += 1;
  }
  return id;
}
