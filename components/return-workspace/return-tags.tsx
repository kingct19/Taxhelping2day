"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { XIcon } from "lucide-react";
import { addReturnTagAction, removeReturnTagAction } from "@/lib/automation-actions";
import type { FirmTag } from "@/lib/automations";
import { Button } from "@/components/ui/button";

export function ReturnTags({ returnId, applied, catalog }: { returnId: string; applied: FirmTag[]; catalog: FirmTag[] }) {
  const router = useRouter();
  const [tagId, setTagId] = useState(catalog.find((tag) => !applied.some((item) => item.id === tag.id))?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const available = catalog.filter((tag) => !applied.some((item) => item.id === tag.id));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {applied.map((tag) => (
          <span key={tag.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
            {tag.name}
            <button
              type="button"
              aria-label={`Remove ${tag.name}`}
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await removeReturnTagAction(returnId, tag.id);
                  setError(result.error);
                  if (!result.error) router.refresh();
                });
              }}
            >
              <XIcon className="size-3" />
            </button>
          </span>
        ))}
        {available.length > 0 ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!tagId) return;
              startTransition(async () => {
                const result = await addReturnTagAction(returnId, tagId);
                setError(result.error);
                if (!result.error) router.refresh();
              });
            }}
          >
            <select className="h-8 rounded-lg border border-input bg-white px-2 text-sm dark:bg-input/30" value={tagId} onChange={(event) => setTagId(event.target.value)} aria-label="Tag">
              {available.map((tag) => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="outline" disabled={pending}>Add tag</Button>
          </form>
        ) : (
          <Link href="/settings/tags" className="text-xs text-muted-foreground underline">Manage tags</Link>
        )}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
