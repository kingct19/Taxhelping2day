"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SourceReader } from "@/components/library/source-reader";
import {
  authorityGroupLabel,
  authorityGroups,
  authorityShelves,
  type AuthorityRef,
  type AuthorityShelf,
} from "@/lib/authorities/catalog";
import { isStateDocument } from "@/lib/authorities/state-hosts";

const pageSize = 100;

function loadCorpus(corpus: NonNullable<AuthorityShelf["corpus"]>) {
  switch (corpus) {
    case "irc":
      return import("@/lib/authorities/irc.json");
    case "regulations":
      return import("@/lib/authorities/regulations.json");
    case "rules":
      return import("@/lib/authorities/rules.json");
    case "opinions":
      return import("@/lib/authorities/opinions.json");
    case "publications":
      return import("@/lib/authorities/publications.json");
    case "irm":
      return import("@/lib/authorities/irm.json");
    case "aod":
      return import("@/lib/authorities/aod.json");
    case "practice-units":
      return import("@/lib/authorities/practice-units.json");
    case "guides":
      return import("@/lib/authorities/guides.json");
    case "faqs":
      return import("@/lib/authorities/faqs.json");
    case "rates":
      return import("@/lib/authorities/rates.json");
    case "bulletins":
      return import("@/lib/authorities/bulletins.json");
    case "treaties":
      return import("@/lib/authorities/treaties.json");
    case "explanations":
      return import("@/lib/authorities/explanations.json");
    case "counsel":
      return import("@/lib/authorities/counsel.json");
    default: {
      const exhaustive: never = corpus;
      return exhaustive;
    }
  }
}

type CorpusFile = {
  publisher: string;
  asOf?: string;
  items: AuthorityRef[];
};

export function AuthorityBrowser({ firm }: { firm: AuthorityRef[] }) {
  const shelves = useMemo<AuthorityShelf[]>(
    () => [
      ...authorityShelves,
      {
        id: "firm",
        group: "firm",
        label: "Practice guides",
        summary: "How this practice works with a client. These pages are the firm’s own writing.",
        items: firm,
      },
    ],
    [firm],
  );
  const [shelfId, setShelfId] = useState("irc");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [corpus, setCorpus] = useState<CorpusFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [opinions, setOpinions] = useState<AuthorityRef[]>([]);
  const [listedTotal, setListedTotal] = useState<number | null>(null);
  const [opinionNote, setOpinionNote] = useState("");
  const [readingHref, setReadingHref] = useState("");
  const shelf = shelves.find((item) => item.id === shelfId) ?? shelves[0];

  useEffect(() => {
    let cancelled = false;
    if (!shelf.corpus) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const load = loadCorpus(shelf.corpus);
    load.then((file) => {
      if (cancelled) return;
      setCorpus(file.default);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [shelf.corpus, shelf.id]);

  useEffect(() => {
    if (!shelf.live) {
      setOpinionNote("");
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setOpinionNote("");
      fetch(`/library/opinions?kind=${shelf.live}&q=${encodeURIComponent(query)}&page=${page}`)
        .then(async (response) => {
          const payload = (await response.json()) as { items?: AuthorityRef[]; total?: number; error?: string };
          if (!response.ok) throw new Error(payload.error || "The official list could not be read.");
          return payload;
        })
        .then((payload) => {
          if (cancelled) return;
          setOpinions(payload.items ?? []);
          setListedTotal(typeof payload.total === "number" ? payload.total : null);
          setLoading(false);
        })
        .catch((reason: unknown) => {
          if (cancelled) return;
          setOpinions([]);
          setListedTotal(null);
          setOpinionNote(reason instanceof Error ? reason.message : "The Tax Court opinion list could not be read.");
          setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [page, query, shelf.id, shelf.live]);

  useEffect(() => {
    if (!shelf.pack) {
      if (!shelf.corpus && !shelf.live) setLoading(false);
      return;
    }
    let cancelled = false;
    setOpinions([]);
    setListedTotal(null);
    setLoading(true);
    const timer = setTimeout(() => {
      setOpinionNote("");
      fetch(`/library/pack?name=${encodeURIComponent(shelf.pack ?? "")}&q=${encodeURIComponent(query)}&page=${page}`)
        .then(async (response) => {
          const payload = (await response.json()) as { items?: AuthorityRef[]; total?: number; error?: string };
          if (!response.ok) throw new Error(payload.error || "The official list could not be read.");
          return payload;
        })
        .then((payload) => {
          if (cancelled) return;
          setOpinions(payload.items ?? []);
          setListedTotal(typeof payload.total === "number" ? payload.total : null);
          setLoading(false);
        })
        .catch((reason: unknown) => {
          if (cancelled) return;
          setOpinions([]);
          setListedTotal(null);
          setOpinionNote(reason instanceof Error ? reason.message : "The state decision list could not be read.");
          setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [page, query, shelf.id, shelf.pack, shelf.corpus, shelf.live]);

  const serverPaged = shelf.live === "orders" || Boolean(shelf.pack);
  const items = shelf.pack || shelf.live ? opinions : shelf.corpus ? (corpus?.items ?? []) : (shelf.items ?? []);
  const filtered = useMemo(() => {
    if (shelf.live || shelf.pack) return items;
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => `${item.cite} ${item.title}`.toLowerCase().includes(needle));
  }, [items, query, shelf.live, shelf.pack]);
  const totalCount = serverPaged && listedTotal !== null ? listedTotal : filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = serverPaged ? items : filtered.slice(currentPage * pageSize, currentPage * pageSize + pageSize);
  const from = totalCount === 0 ? 0 : currentPage * pageSize + 1;
  const to = Math.min(totalCount, (currentPage + 1) * pageSize);

  function openShelf(id: string) {
    setShelfId(id);
    setQuery("");
    setPage(0);
    setReadingHref("");
    if (shelves.find((item) => item.id === id)?.corpus !== shelf.corpus) {
      setCorpus(null);
    }
  }

  function canCopy(href: string) {
    return href.startsWith("https://uscode.house.gov/us/usc/t26/")
      || href.startsWith("https://www.ecfr.gov/current/title-26/")
      || href.startsWith("opinion:")
      || href.startsWith("federal:")
      || /^https:\/\/(?:www\.)?ustaxcourt\.gov\/files\/documents\/rule-[0-9]+(?:\.[0-9]+)?[A-Za-z]?\.pdf$/.test(href)
      || /^https:\/\/www\.irs\.gov\/pub\/(?:irs-pdf|irs-aod|irs-irbs|irs-wd|irs-trty|fatca)\//i.test(href)
      || /^https:\/\/www\.irs\.gov\/(?:irm\/part\d+\/irm_|irb\/\d{4}-\d+_IRB|publications\/p|faqs\/|businesses\/)/i.test(href)
      || isStateDocument(href);
  }

  function searchPlaceholder(current: AuthorityShelf) {
    if (current.pack) return "Search decisions";
    switch (current.live) {
      case "opinions":
      case "federal":
        return "Search opinions";
      case "orders":
        return "Search orders";
      case undefined:
        return "Search this source";
      default: {
        const exhaustive: never = current.live;
        return exhaustive;
      }
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <aside className="max-h-72 shrink-0 overflow-auto border-b lg:max-h-none lg:w-64 lg:border-r lg:border-b-0">
        <div className="px-4 py-4">
          <h1 className="text-sm font-semibold">Authoritative sources</h1>
          <p className="mt-1 text-xs text-muted-foreground">The Code, the regulations, and the offices that publish the rest.</p>
        </div>
        {authorityGroups.map((group) => {
          const inGroup = shelves.filter((item) => item.group === group.id);
          if (inGroup.length === 0) return null;
          return (
            <div key={group.id} className="pb-3">
              <p className="px-4 pt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{authorityGroupLabel(group.id)}</p>
              <div className="mt-1 flex flex-col px-2">
                {inGroup.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openShelf(item.id)}
                    className={`rounded-md px-2 py-1.5 text-left text-sm ${item.id === shelf.id ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
                    aria-current={item.id === shelf.id ? "page" : undefined}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </aside>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        {readingHref ? (
          <SourceReader href={readingHref} onBack={() => setReadingHref("")} />
        ) : (
          <>
        <div className="flex flex-col gap-3 border-b px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-semibold">{shelf.label}</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {shelf.summary}
                {shelf.corpus && corpus?.asOf ? ` Current through ${corpus.asOf}.` : ""}
              </p>
            </div>
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder={searchPlaceholder(shelf)}
              aria-label={`Search ${shelf.label}`}
              className="sm:w-64"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {loading ? "Loading the official list…" : opinionNote ? opinionNote : totalCount === 0 ? (shelf.live || shelf.pack ? "No matching documents." : "No matching sections.") : `${from}–${to} of ${totalCount.toLocaleString("en-US")}`}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {visible.map((item) => {
            if (canCopy(item.href)) {
              return (
                <button
                  key={`${item.cite}-${item.href}`}
                  type="button"
                  onClick={() => setReadingHref(item.href)}
                  className="block w-full border-b px-4 py-3 text-left hover:bg-muted/50 sm:px-6"
                >
                  <span className="block text-sm font-medium">{item.cite}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{item.title.trim()}</span>
                </button>
              );
            }
            const external = item.href.startsWith("http");
            return (
              <Link
                key={`${item.cite}-${item.href}`}
                href={item.href}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
                className="block border-b px-4 py-3 hover:bg-muted/50 sm:px-6"
              >
                <span className="block text-sm font-medium">{item.cite}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{item.title.trim()}</span>
              </Link>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3 sm:px-6">
          <Button type="button" variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
            Previous
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>
            Next
          </Button>
        </div>
          </>
        )}
      </section>
    </div>
  );
}
