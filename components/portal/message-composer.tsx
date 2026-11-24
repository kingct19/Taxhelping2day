"use client";

import { useState } from "react";
import { PaperclipIcon, SendIcon } from "lucide-react";
import { postMessage } from "@/lib/actions";
import { Button } from "@/components/ui/button";

const maxBytes = 15 * 1024 * 1024;

export function MessageComposer() {
  const [error, setError] = useState<string | null>(null);
  const [names, setNames] = useState<string[]>([]);

  return (
    <form
      action={postMessage}
      className="grid gap-2 border-t border-border pt-3"
      onSubmit={(event) => {
        const input = event.currentTarget.elements.namedItem("files");
        if (!(input instanceof HTMLInputElement) || !input.files) return;
        for (const file of input.files) {
          if (file.size > maxBytes) {
            event.preventDefault();
            setError("Each file must be 15 MB or smaller.");
            return;
          }
        }
        setError(null);
      }}
    >
      <label className="sr-only" htmlFor="body">Message</label>
      <textarea
        id="body"
        name="body"
        rows={2}
        placeholder="Write to your tax professional"
        className="min-h-16 w-full resize-none rounded-lg bg-background px-3 py-2 text-sm ring-1 ring-foreground/10 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex items-center justify-between gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground">
          <PaperclipIcon className="size-3.5" />
          Attach
          <input
            className="sr-only"
            name="files"
            type="file"
            multiple
            onChange={(event) => setNames(Array.from(event.target.files ?? []).map((file) => file.name))}
          />
        </label>
        <Button type="submit" size="sm">
          Send
          <SendIcon />
        </Button>
      </div>
      {names.length > 0 ? <p className="truncate text-xs text-muted-foreground">{names.join(", ")}</p> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
