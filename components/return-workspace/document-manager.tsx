"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { advanceRequest, recordIntakeReview, remindRequest } from "@/lib/actions";
import type { DocumentEntry, DocumentGroup } from "@/lib/return-documents";
import { cn } from "@/lib/utils";

type DocumentFilter = "all" | DocumentGroup | "review" | "waiting" | "missing";

const categories: { id: DocumentFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "source", label: "Source" },
  { id: "workpaper", label: "Workpapers" },
  { id: "signed", label: "Signed" },
  { id: "review", label: "Needs review" },
  { id: "waiting", label: "Waiting" },
  { id: "missing", label: "Missing" },
];

export function DocumentManager({
  profileId,
  returnId,
  entries,
  fileId,
}: {
  profileId: string;
  returnId: string;
  entries: DocumentEntry[];
  fileId: string | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]["id"]>("all");
  const filtered = entries.filter((entry) => {
    if (category === "source" || category === "workpaper" || category === "signed") {
      if (entry.group !== category) return false;
    } else if (category !== "all" && entry.category !== category) {
      return false;
    }
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${entry.label} ${entry.meta} ${entry.status} ${entry.uploader ?? ""}`.toLowerCase().includes(needle);
  });
  const selected = entries.find((entry) => entry.id === fileId) ?? filtered.find((entry) => entry.category !== "missing" || entry.request || entry.downloadHref) ?? filtered[0] ?? null;

  function choose(id: string) {
    router.replace(`/returns/${profileId}/${returnId}?tab=documents&file=${encodeURIComponent(id)}`, { scroll: false });
  }

  return (
    <div className="grid min-h-0 gap-3 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
      <div className="flex max-h-[34rem] flex-col gap-2 rounded-lg border p-2">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documents" aria-label="Search documents" />
        <div className="grid gap-1">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Status">
            {categories.filter((item) => item.id === "all" || item.id === "review" || item.id === "waiting" || item.id === "missing").map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={category === item.id ? "secondary" : "ghost"}
                aria-pressed={category === item.id}
                onClick={() => setCategory(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Kind">
            {categories.filter((item) => item.id === "source" || item.id === "workpaper" || item.id === "signed").map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={category === item.id ? "secondary" : "ghost"}
                aria-pressed={category === item.id}
                onClick={() => setCategory(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <p className="px-1 py-4 text-sm text-muted-foreground">No documents match this view.</p>
        ) : (
          <ul className="min-h-0 flex-1 overflow-auto">
            {filtered.map((entry) => {
              const active = selected?.id === entry.id;
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => choose(entry.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn("flex w-full items-start justify-between gap-2 rounded-md px-2 py-2 text-left hover:bg-muted", active && "bg-muted")}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{entry.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{entry.meta}</span>
                    </span>
                    <Badge variant={entry.tone} className="mt-0.5 shrink-0">{entry.status}</Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <DocumentDetail profileId={profileId} returnId={returnId} entry={selected} />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <li className="grid gap-0.5 border-t py-2 first:border-t-0 first:pt-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </li>
  );
}

function DocumentDetail({ profileId, returnId, entry }: { profileId: string; returnId: string; entry: DocumentEntry | null }) {
  if (!entry) {
    return <p className="rounded-lg border px-3 py-6 text-sm text-muted-foreground">No documents on this return yet.</p>;
  }
  const review = recordIntakeReview.bind(null, profileId, returnId);
  const request = entry.request;
  return (
    <article className="overflow-hidden rounded-lg border">
      {entry.contentType === "application/pdf" && entry.previewHref ? (
        <iframe title={entry.label} src={entry.previewHref} className="h-80 w-full bg-white" style={{ colorScheme: "light" }} />
      ) : entry.contentType?.startsWith("image/") && entry.previewHref ? (
        <div className="relative h-80 bg-white">
          <Image alt="" src={entry.previewHref} fill unoptimized className="object-contain" />
        </div>
      ) : entry.downloadHref ? (
        <p className="px-3 py-6 text-sm text-muted-foreground">This file type has no preview. Download it to read it.</p>
      ) : (
        <p className="px-3 py-6 text-sm text-muted-foreground">No file has been uploaded for this item.</p>
      )}
      <div className="grid gap-3 border-t p-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-medium">{entry.label}</h2>
          <Badge variant={entry.tone}>{entry.status}</Badge>
        </div>
        <ul className="grid">
          <Fact label="File" value={entry.meta} />
          {entry.uploader ? <Fact label="Uploaded by" value={entry.uploader} /> : null}
          {request?.blockLabel ? <Fact label="Effect" value={request.blockLabel} /> : null}
          {entry.fileId ? <Fact label="File review" value={entry.reviewed ? "Marked reviewed" : "Not marked reviewed"} /> : null}
          {request?.detail ? <Fact label="Latest note" value={request.detail} /> : null}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          {entry.downloadHref ? (
            <Button nativeButton={false} variant="outline" size="sm" render={<a href={entry.downloadHref} />}>Download</Button>
          ) : null}
          {entry.fileId && !entry.reviewed ? (
            <form action={review}>
              <input type="hidden" name="file" value={entry.fileId} />
              <Button name="action" value="accept" type="submit" variant="outline" size="sm">Mark file reviewed</Button>
            </form>
          ) : null}
          {request?.staffOwes ? (
            <form action={(form) => advanceRequest(profileId, request.previousId, form)}>
              <Button name="decision" value="accepted" type="submit" size="sm">Accept</Button>
            </form>
          ) : null}
          {request?.canRemind ? (
            <form action={remindRequest.bind(null, profileId, request.previousId)}>
              <Button type="submit" variant="outline" size="sm">Email reminder</Button>
            </form>
          ) : null}
        </div>
        {request?.clientOwes ? <p className="text-sm text-muted-foreground">Waiting on the client.</p> : null}
        {request?.staffOwes ? (
          <div className="grid gap-3 border-t pt-3">
            <form action={(form) => advanceRequest(profileId, request.previousId, form)} className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Correction</span>
              <div className="flex flex-wrap items-center gap-2">
                <Input name="reason" required maxLength={1000} aria-label="What needs correcting" placeholder="What needs correcting?" className="min-w-48 flex-1" />
                <Button variant="outline" name="decision" value="replacement" type="submit" size="sm">Request correction</Button>
              </div>
            </form>
            <form action={(form) => advanceRequest(profileId, request.previousId, form)} className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Waiver</span>
              <div className="flex flex-wrap items-center gap-2">
                <Input name="reason" required maxLength={1000} aria-label="Why this can be waived" placeholder="Why this requirement can be waived" className="min-w-48 flex-1" />
                <Button variant="outline" name="decision" value="waived" type="submit" size="sm">Waive</Button>
              </div>
            </form>
          </div>
        ) : null}
        {entry.history.length > 0 ? (
          <div className="grid gap-1 border-t pt-3">
            <h3 className="text-xs font-medium text-muted-foreground">History</h3>
            <ul className="grid">
              {entry.history.map((line, index) => (
                <li key={`${index}-${line}`} className="border-t py-1.5 text-sm first:border-t-0 first:pt-0">{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  );
}
