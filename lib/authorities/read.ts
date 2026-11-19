import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { extractTextItems } from "unpdf";
import type { AuthorityRef } from "@/lib/authorities/catalog";
import type { AuthorityDocument } from "@/lib/authorities/document";
import { isStateDocument } from "@/lib/authorities/state-hosts";

const dawson = "https://public-api-green.dawson.ustaxcourt.gov/public-api";
const regulationDate = "2026-11-12";
const codeHref = /^https:\/\/uscode\.house\.gov\/us\/usc\/t26\/s[^/]+\/$/;
const regulationHref = /^\/current\/title-26\/(?:chapter-[^/]+\/)?(?:subchapter-[^/]+\/)?part-([^/]+)\/(?:subpart-[^/]+\/)?section-(.+)$/;
const opinionHref = /^opinion:([0-9A-Za-z\-]+)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const federalHref = /^federal:(USCOURTS-[A-Za-z0-9._-]+)\/(USCOURTS-[A-Za-z0-9._-]+)$/;
const ruleHref = /^https:\/\/(?:www\.)?ustaxcourt\.gov\/files\/documents\/rule-[0-9]+(?:\.[0-9]+)?[A-Za-z]?\.pdf$/;
const irsPdfHref = /^https:\/\/www\.irs\.gov\/pub\/(?:irs-pdf|irs-aod|irs-irbs|irs-wd|irs-trty|fatca)\//i;
const irsPageHref = /^https:\/\/www\.irs\.gov\/(?:irm\/part\d+\/irm_|irb\/\d{4}-\d+_IRB|publications\/p|faqs\/|businesses\/)/i;

type OpinionRow = {
  caseCaption?: string;
  docketEntryId?: string;
  docketNumber?: string;
  documentTitle?: string;
  documentType?: string;
  filingDate?: string;
  judge?: string;
};

function decode(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function textOf(html: string) {
  return decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function usDate(date: Date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${month}/${day}/${date.getUTCFullYear()}`;
}

async function remember(key: string, load: () => Promise<AuthorityDocument>) {
  const file = path.join(process.cwd(), "data", "authority-cache", `${createHash("sha256").update(key).digest("hex")}.json`);
  try {
    return JSON.parse(await readFile(file, "utf8")) as AuthorityDocument;
  } catch {
    const document = await load();
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(document));
    return document;
  }
}

function codeParagraphs(html: string) {
  const start = html.search(/<h3[^>]*>\s*§/);
  const slice = start >= 0 ? html.slice(start) : html;
  const end = slice.search(/About the Office/i);
  const body = end > 0 ? slice.slice(0, end) : slice;
  const paragraphs: string[] = [];
  const pattern = /<(h3|p)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  for (const match of body.matchAll(pattern)) {
    const paragraph = textOf(match[2] ?? "");
    if (paragraph) paragraphs.push(paragraph);
  }
  return paragraphs;
}

function regulationParagraphs(xml: string) {
  const paragraphs: string[] = [];
  const pattern = /<(HEAD|P)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  for (const match of xml.matchAll(pattern)) {
    const paragraph = textOf(match[2] ?? "");
    if (paragraph) paragraphs.push(paragraph);
  }
  return paragraphs;
}

async function readCode(href: string) {
  const response = await fetch(href, { headers: { "User-Agent": "TaxHelping2day library" } });
  if (!response.ok) throw new Error("The Code section could not be read from the House of Representatives.");
  const paragraphs = codeParagraphs(await response.text());
  if (paragraphs.length === 0) throw new Error("The Code section came back without text.");
  const title = paragraphs[0] ?? "Internal Revenue Code";
  return {
    title,
    cite: title,
    paragraphs: paragraphs.slice(1),
    sourceLabel: "uscode.house.gov",
    sourceHref: href,
  };
}

async function readRegulation(href: string, part: string, section: string) {
  const url = `https://www.ecfr.gov/api/versioner/v1/full/${regulationDate}/title-26.xml?part=${part}&section=${encodeURIComponent(section)}`;
  const response = await fetch(url, { headers: { Accept: "application/xml", "User-Agent": "TaxHelping2day library" } });
  if (!response.ok) throw new Error("The regulation could not be read from the eCFR.");
  const paragraphs = regulationParagraphs(await response.text());
  if (paragraphs.length === 0) throw new Error("The regulation came back without text.");
  const title = paragraphs[0] ?? section;
  return {
    title,
    cite: `26 CFR ${section}`,
    paragraphs: paragraphs.slice(1),
    sourceLabel: "ecfr.gov",
    sourceHref: href,
  };
}

async function readCourtRule(href: string) {
  return remember(`rule-v1:${href}`, async () => {
    const file = await fetch(href, { headers: { "User-Agent": "TaxHelping2day library" } });
    if (!file.ok) throw new Error("The Tax Court rule could not be copied in.");
    const extracted = await extractTextItems(new Uint8Array(await file.arrayBuffer()));
    const paragraphs = paragraphsFromPdf(extracted.items);
    if (paragraphs.length === 0) throw new Error("The rule came back without text.");
    const title = paragraphs[0] ?? "Tax Court rule";
    return {
      title,
      cite: title,
      paragraphs: paragraphs.slice(1),
      sourceLabel: "ustaxcourt.gov",
      sourceHref: "https://www.ustaxcourt.gov/rules/",
    };
  });
}

function pageParagraphs(html: string) {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const start = withoutScripts.search(/<h1\b/i);
  const slice = start >= 0 ? withoutScripts.slice(start) : withoutScripts;
  const end = slice.search(/<footer\b/i);
  const body = end > 0 ? slice.slice(0, end) : slice;
  const paragraphs: string[] = [];
  const pattern = /<(h1|h2|h3|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  for (const match of body.matchAll(pattern)) {
    const paragraph = textOf(match[2] ?? "");
    if (paragraph.length > 1) paragraphs.push(paragraph);
  }
  return paragraphs;
}

async function readPdf(href: string, sourceLabel: string, sourceHref: string, empty: string) {
  const file = await fetch(href, { headers: { "User-Agent": "TaxHelping2day library" } });
  if (!file.ok) throw new Error(empty);
  const extracted = await extractTextItems(new Uint8Array(await file.arrayBuffer()));
  const paragraphs = paragraphsFromPdf(extracted.items);
  if (paragraphs.length === 0) throw new Error(empty);
  const title = paragraphs[0] ?? sourceLabel;
  return { title, cite: title, paragraphs: paragraphs.slice(1), sourceLabel, sourceHref };
}

async function readIrsPage(href: string) {
  return remember(`irs-page-v1:${href}`, async () => {
    const response = await fetch(href, { headers: { "User-Agent": "TaxHelping2day library" } });
    if (!response.ok) throw new Error("The IRS page could not be copied in.");
    const paragraphs = pageParagraphs(await response.text());
    if (paragraphs.length === 0) throw new Error("The IRS page came back without text.");
    return {
      title: paragraphs[0] ?? "IRS",
      cite: paragraphs[0] ?? "IRS",
      paragraphs: paragraphs.slice(1, 80),
      sourceLabel: "irs.gov",
      sourceHref: href,
    };
  });
}

const stateAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function sameHostFile(pageHref: string, html: string) {
  const page = new URL(pageHref);
  const withoutChrome = html
    .replace(/<header\b[\s\S]*?<\/header>/gi, " ")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, " ");
  const pattern = /href=["']([^"']+)["']/gi;
  const found: string[] = [];
  for (const match of withoutChrome.matchAll(pattern)) {
    const raw = match[1] ?? "";
    if (raw.startsWith("#") || raw.startsWith("mailto:")) continue;
    let next: URL;
    try {
      next = new URL(raw, pageHref);
    } catch {
      continue;
    }
    if (next.protocol !== "https:" || next.host !== page.host || next.username || next.password) continue;
    const path = next.pathname.toLowerCase();
    if (path.endsWith(".pdf") || path.endsWith(".doc") || path.endsWith(".docx") || path.includes("/decision/download")) {
      found.push(next.href);
    }
  }
  return found.find((href) => !/inventory|rule-inventory|red-tape/i.test(href)) ?? found[0] ?? "";
}

async function pdfDocument(bytes: ArrayBuffer, sourceLabel: string, sourceHref: string) {
  if (bytes.byteLength > 20_000_000) throw new Error("That decision file is too large to copy in.");
  const extracted = await extractTextItems(new Uint8Array(bytes));
  const paragraphs = paragraphsFromPdf(extracted.items);
  if (paragraphs.length === 0) throw new Error("The official decision came back without text.");
  const title = paragraphs[0] ?? sourceLabel;
  return { title, cite: title, paragraphs: paragraphs.slice(1), sourceLabel, sourceHref };
}

async function readStateDocument(href: string) {
  return remember(`state-v1:${href}`, async () => {
    const response = await fetch(href, { headers: { "User-Agent": stateAgent, Accept: "text/html,application/pdf" } });
    if (!response.ok) throw new Error("The official decision could not be copied in.");
    const finalHref = response.url || href;
    if (new URL(finalHref).host !== new URL(href).host) throw new Error("That source is not one this library copies in.");
    const type = response.headers.get("content-type") ?? "";
    const host = new URL(href).host;
    if (type.includes("pdf") || href.toLowerCase().endsWith(".pdf") || finalHref.toLowerCase().endsWith(".pdf")) {
      return pdfDocument(await response.arrayBuffer(), host, href);
    }
    const html = await response.text();
    const fileHref = sameHostFile(href, html);
    if (fileHref) {
      const file = await fetch(fileHref, { headers: { "User-Agent": stateAgent, Accept: "application/pdf" } });
      if (!file.ok) throw new Error("The official decision could not be copied in.");
      return pdfDocument(await file.arrayBuffer(), host, href);
    }
    const paragraphs = pageParagraphs(html);
    if (paragraphs.length === 0) throw new Error("The official decision came back without text.");
    const title = paragraphs[0] ?? host;
    return {
      title,
      cite: title,
      paragraphs: paragraphs.slice(1, 200),
      sourceLabel: host,
      sourceHref: href,
    };
  });
}

export async function readLinkedSource(href: string) {
  if (isStateDocument(href)) return readStateDocument(href);
  if (ruleHref.test(href)) return readCourtRule(href);
  if (irsPdfHref.test(href)) return remember(`irs-pdf-v1:${href}`, () => readPdf(href, "irs.gov", href, "The IRS document could not be copied in."));
  if (irsPageHref.test(href)) return readIrsPage(href);
  if (codeHref.test(href)) return remember(href, () => readCode(href));
  let pathname = "";
  try {
    const url = new URL(href);
    if (url.host !== "www.ecfr.gov") throw new Error("That source is not one this library copies in.");
    pathname = url.pathname;
  } catch (error) {
    if (error instanceof Error && error.message === "That source is not one this library copies in.") throw error;
    throw new Error("That source is not one this library copies in.");
  }
  const regulation = regulationHref.exec(pathname);
  if (regulation?.[1] && regulation[2]) {
    const part = regulation[1];
    const section = decodeURIComponent(regulation[2]);
    return remember(href, () => readRegulation(href, part, section));
  }
  throw new Error("That source is not one this library copies in.");
}

export type LiveShelf = "opinions" | "orders" | "federal";

type FederalRow = {
  title?: string;
  packageId?: string;
  granuleId?: string;
  governmentAuthor?: string[];
  dateIssued?: string;
};

function searchWindow(keyword: string, emptyDays: number, keywordYears: number) {
  const end = new Date();
  const start = new Date(end);
  const term = keyword.trim().slice(0, 200);
  if (term) start.setUTCFullYear(start.getUTCFullYear() - keywordYears);
  else start.setUTCDate(start.getUTCDate() - emptyDays);
  return { term, start, end };
}

function rowsToRefs(rows: OpinionRow[], fallback: string): AuthorityRef[] {
  return rows.flatMap((row) => {
    if (!row.docketNumber || !row.docketEntryId) return [];
    const filed = row.filingDate ? row.filingDate.slice(0, 10) : "";
    return [{
      cite: row.documentTitle || row.documentType || fallback,
      title: [row.caseCaption, row.judge ? `Judge ${row.judge}` : "", filed].filter(Boolean).join(" · "),
      href: `opinion:${row.docketNumber}/${row.docketEntryId}`,
    }];
  });
}

async function searchDawson(path: "opinion-search" | "order-search", keyword: string, emptyDays: number, keywordYears: number, opinionTypes?: string) {
  const { term, start, end } = searchWindow(keyword, emptyDays, keywordYears);
  const params = new URLSearchParams({
    dateRange: "customDates",
    startDate: usDate(start),
    endDate: usDate(end),
  });
  if (opinionTypes) params.set("opinionTypes", opinionTypes);
  if (term) params.set("keyword", term);
  const response = await fetch(`${dawson}/${path}?${params}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("The Tax Court list could not be read.");
  const payload = (await response.json()) as { results?: OpinionRow[] };
  return payload.results ?? [];
}

export async function searchTaxCourtOpinions(keyword: string): Promise<AuthorityRef[]> {
  const rows = await searchDawson("opinion-search", keyword, 45, 30, "MOP,SOP,TCOP");
  return rowsToRefs(rows, "Tax Court opinion");
}

type OrderIndex = {
  asOf?: string;
  items: AuthorityRef[];
};

let orderIndex: OrderIndex | null = null;

async function loadOrderIndex() {
  if (orderIndex) return orderIndex;
  const file = path.join(process.cwd(), "lib", "authorities", "orders.json");
  orderIndex = JSON.parse(await readFile(file, "utf8")) as OrderIndex;
  return orderIndex;
}

export async function pageTaxCourtOrders(keyword: string, page: number) {
  const index = await loadOrderIndex();
  const needle = keyword.trim().toLowerCase();
  const matched = needle
    ? index.items.filter((item) => `${item.cite} ${item.title}`.toLowerCase().includes(needle))
    : index.items;
  const start = Math.max(0, page) * 100;
  return {
    items: matched.slice(start, start + 100),
    total: matched.length,
    asOf: index.asOf ?? "",
  };
}

type StatePackFile = {
  asOf?: string;
  office?: string;
  items: AuthorityRef[];
};

const statePacks = new Map<string, StatePackFile>();

export async function pageStateDecisions(name: string, keyword: string, page: number) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) throw new Error("That state list is not on file.");
  let pack = statePacks.get(name);
  if (!pack) {
    const file = path.join(process.cwd(), "lib", "authorities", "state-decisions", `${name}.json`);
    pack = JSON.parse(await readFile(file, "utf8")) as StatePackFile;
    statePacks.set(name, pack);
  }
  const needle = keyword.trim().toLowerCase();
  const matched = needle
    ? pack.items.filter((item) => `${item.cite} ${item.title}`.toLowerCase().includes(needle))
    : pack.items;
  const start = Math.max(0, page) * 100;
  return {
    items: matched.slice(start, start + 100),
    total: matched.length,
    asOf: pack.asOf ?? "",
    office: pack.office ?? "",
  };
}

export async function searchFederalOpinions(keyword: string): Promise<AuthorityRef[]> {
  const term = keyword.replace(/[^A-Za-z0-9 .'-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  const query = term
    ? `collection:USCOURTS ("Internal Revenue" OR "26 U.S.C." OR "I.R.C.") ${term}`
    : 'collection:USCOURTS ("Internal Revenue" OR "26 U.S.C." OR "I.R.C.")';
  const response = await fetch("https://api.govinfo.gov/search", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Api-Key": process.env.GOVINFO_API_KEY || "DEMO_KEY",
      "User-Agent": "TaxHelping2day library",
    },
    body: JSON.stringify({
      query,
      pageSize: 100,
      offsetMark: "*",
      sorts: [{ field: "publishdate", sortOrder: "DESC" }],
    }),
  });
  if (!response.ok) throw new Error("The federal opinion list could not be read from GovInfo.");
  const payload = (await response.json()) as { results?: FederalRow[] };
  return (payload.results ?? []).flatMap((row) => {
    if (!row.packageId || !row.granuleId || !row.granuleId.startsWith(row.packageId)) return [];
    if (!/^USCOURTS-[A-Za-z0-9._-]+$/.test(row.packageId) || !/^USCOURTS-[A-Za-z0-9._-]+$/.test(row.granuleId)) return [];
    return [{
      cite: row.title || "Federal opinion",
      title: [row.governmentAuthor?.[0] ?? "Federal court", row.dateIssued ?? ""].filter(Boolean).join(" · "),
      href: `federal:${row.packageId}/${row.granuleId}`,
    }];
  });
}

export async function searchLiveShelf(kind: LiveShelf, keyword: string): Promise<AuthorityRef[]> {
  switch (kind) {
    case "opinions":
      return searchTaxCourtOpinions(keyword);
    case "orders":
      return (await pageTaxCourtOrders(keyword, 0)).items;
    case "federal":
      return searchFederalOpinions(keyword);
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

function paragraphsFromPdf(pages: { str: string; x: number; y: number; fontSize: number }[][]) {
  const paragraphs: string[] = [];
  for (const page of pages) {
    const lines: { y: number; parts: { x: number; str: string; fontSize: number }[] }[] = [];
    for (const item of page) {
      if (!item.str.trim()) continue;
      const line = lines.find((entry) => Math.abs(entry.y - item.y) <= 2);
      if (line) line.parts.push(item);
      else lines.push({ y: item.y, parts: [item] });
    }
    lines.sort((a, b) => b.y - a.y);
    let current = "";
    let lastY: number | null = null;
    let lastSize = 0;
    for (const line of lines) {
      const text = line.parts
        .sort((a, b) => a.x - b.x)
        .map((part) => part.str)
        .join("")
        .replace(/\s+/g, " ")
        .trim();
      if (!text || /^-\s*\d+\s*-$/.test(text)) continue;
      const size = line.parts[0]?.fontSize ?? 12;
      const gap = lastY === null ? 0 : lastY - line.y;
      const newParagraph = lastY !== null && (gap > size * 1.8 || (current.length > 0 && size > lastSize + 0.6));
      if (newParagraph) {
        paragraphs.push(current);
        current = text;
      } else {
        current = current ? `${current} ${text}` : text;
      }
      lastY = line.y;
      lastSize = size;
    }
    if (current) paragraphs.push(current);
  }
  return paragraphs.filter((paragraph) => paragraph.length > 0);
}

export async function readTaxCourtOpinion(href: string) {
  const match = opinionHref.exec(href);
  if (!match?.[1] || !match[2]) throw new Error("That opinion reference is not valid.");
  const docket = match[1];
  const entry = match[2];
  return remember(`opinion-v2:${href}`, async () => {
    const located = await fetch(`${dawson}/${encodeURIComponent(docket)}/${entry}/public-document-download-url`, {
      headers: { Accept: "application/json" },
    });
    if (!located.ok) throw new Error("The Tax Court did not return this opinion.");
    const payload = (await located.json()) as { url?: string };
    const fileUrl = payload.url;
    if (!fileUrl) throw new Error("The Tax Court did not return this opinion.");
    const host = new URL(fileUrl).host;
    if (host !== "s3.us-east-1.amazonaws.com" && !host.endsWith("dawson.ustaxcourt.gov")) {
      throw new Error("The opinion file was not on the court’s site.");
    }
    const file = await fetch(fileUrl);
    if (!file.ok) throw new Error("The opinion file could not be copied in.");
    const extracted = await extractTextItems(new Uint8Array(await file.arrayBuffer()));
    const paragraphs = paragraphsFromPdf(extracted.items);
    if (paragraphs.length === 0) throw new Error("The opinion came back without text.");
    return {
      title: paragraphs[0] ?? "Tax Court opinion",
      cite: docket,
      paragraphs: paragraphs.slice(1),
      sourceLabel: "dawson.ustaxcourt.gov",
      sourceHref: "https://dawson.ustaxcourt.gov/",
    };
  });
}

export async function readFederalOpinion(href: string) {
  const match = federalHref.exec(href);
  if (!match?.[1] || !match[2] || !match[2].startsWith(match[1])) throw new Error("That opinion reference is not valid.");
  const packageId = match[1];
  const granuleId = match[2];
  return remember(`federal-v1:${href}`, async () => {
    const key = process.env.GOVINFO_API_KEY || "DEMO_KEY";
    const file = await fetch(`https://api.govinfo.gov/packages/${packageId}/granules/${granuleId}/pdf?api_key=${encodeURIComponent(key)}`, {
      headers: { "User-Agent": "TaxHelping2day library" },
    });
    if (!file.ok) throw new Error("The federal opinion could not be copied in from GovInfo.");
    const extracted = await extractTextItems(new Uint8Array(await file.arrayBuffer()));
    const paragraphs = paragraphsFromPdf(extracted.items);
    if (paragraphs.length === 0) throw new Error("The opinion came back without text.");
    return {
      title: paragraphs[0] ?? "Federal opinion",
      cite: packageId,
      paragraphs: paragraphs.slice(1),
      sourceLabel: "govinfo.gov",
      sourceHref: `https://www.govinfo.gov/app/details/${packageId}`,
    };
  });
}
