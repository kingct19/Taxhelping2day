"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useSavedState } from "@/hooks/use-saved-state";
import { useRouter } from "next/navigation";
import { deleteTagAction, saveTagAction } from "@/lib/automation-actions";
import type { FirmTag } from "@/lib/automations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TagManager({ tags }: { tags: FirmTag[] }) {
  const router = useRouter();
  const [query, setQuery] = useSavedState("view:tags", "", (value): value is string => typeof value === "string");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tags.filter((tag) => tag.name.toLowerCase().includes(needle));
  }, [query, tags]);

  function add(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveTagAction(name);
      if (result.error) {
        setError(result.error);
        return;
      }
      setName("");
      setError(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="max-w-sm" />
        <form className="ml-auto flex gap-2" onSubmit={add}>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Tag name" className="w-48" />
          <Button type="submit" disabled={pending}>Add tag</Button>
        </form>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="overflow-hidden rounded-lg border">
        <div className="border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">Tag name</div>
        {shown.length === 0 ? <p className="px-3 py-6 text-sm text-muted-foreground">No tags yet.</p> : null}
        {shown.map((tag) => (
          <TagRow key={tag.id} tag={tag} onError={setError} />
        ))}
      </div>
    </div>
  );
}

function TagRow({ tag, onError }: { tag: FirmTag; onError: (error: string | null) => void }) {
  const router = useRouter();
  const [name, setName] = useState(tag.name);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex items-center gap-2 border-b px-3 py-2 last:border-b-0"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await saveTagAction(name, tag.id);
          onError(result.error);
          if (!result.error) router.refresh();
        });
      }}
    >
      <Input value={name} onChange={(event) => setName(event.target.value)} aria-label={`Rename ${tag.name}`} />
      <Button type="submit" size="sm" variant="outline" disabled={pending || name.trim() === tag.name}>Rename</Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await deleteTagAction(tag.id);
            onError(result.error);
            if (!result.error) router.refresh();
          });
        }}
      >
        Delete
      </Button>
    </form>
  );
}
