"use client";

import { useEffect, useState } from "react";
import { ChevronLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuthorityDocument } from "@/lib/authorities/document";

export function SourceReader({ href, onBack }: { href: string; onBack: () => void }) {
  const [document, setDocument] = useState<AuthorityDocument | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const endpoint = `/library/read?href=${encodeURIComponent(href)}`;
    fetch(endpoint)
      .then(async (response) => {
        const payload = (await response.json()) as AuthorityDocument & { error?: string };
        if (!response.ok) throw new Error(payload.error || "The source could not be copied in.");
        return payload;
      })
      .then((payload) => {
        if (!cancelled) setDocument(payload);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "The source could not be copied in.");
      });
    return () => {
      cancelled = true;
    };
  }, [href]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeftIcon />
          Sources
        </Button>
      </div>
      <article className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-8">
          {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
          {!document && !error ? <p className="text-sm text-muted-foreground">Copying the official text…</p> : null}
          {document ? (
            <>
              <h2 className="text-2xl font-semibold tracking-tight">{document.title}</h2>
              <p className="text-sm text-muted-foreground">{document.cite}</p>
              {document.paragraphs.map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 24)}`} className="text-sm leading-7">
                  {paragraph}
                </p>
              ))}
              <footer className="mt-6 border-t pt-4 text-sm">
                <a href={document.sourceHref} target="_blank" rel="noreferrer" className="text-muted-foreground underline">
                  {document.sourceLabel}
                </a>
              </footer>
            </>
          ) : null}
        </div>
      </article>
    </div>
  );
}
