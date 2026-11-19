"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const storageKey = "th2d-assistant-note";

export function AssistantDesk() {
  const [note, setNote] = useState("");

  useEffect(() => {
    setNote(window.localStorage.getItem(storageKey) ?? "");
  }, []);

  function save(next: string) {
    setNote(next);
    window.localStorage.setItem(storageKey, next);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center border-b px-4 sm:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold">Assistant</h1>
          <p className="truncate text-xs text-muted-foreground">A layout for the practice. It does not call a model.</p>
        </div>
        <Button type="button" variant="outline" size="lg" className="ml-auto" onClick={() => save("")}>
          Clear note
        </Button>
      </div>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[18rem_minmax(0,1fr)_22rem]">
        <aside className="flex flex-col gap-4 overflow-auto border-b p-4 lg:border-r lg:border-b-0">
          <section className="flex flex-col gap-1">
            <h2 className="text-sm font-medium">Overview</h2>
            <p className="text-sm text-muted-foreground">This screen does not read client files, documents, or taxpayer IDs.</p>
          </section>
          <section className="flex flex-col gap-1">
            <h2 className="text-sm font-medium">Behavior</h2>
            <p className="text-sm text-muted-foreground">Laura Wallace and the practice answer clients directly. The desk does not draft returns, letters, or replies.</p>
          </section>
          <section className="flex flex-col gap-1">
            <h2 className="text-sm font-medium">Sources</h2>
            <p className="text-sm text-muted-foreground">Firm pages live in the Library. They are not connected here, and client uploads are not a source.</p>
          </section>
        </aside>
        <section className="flex min-h-0 flex-col gap-3 overflow-auto p-4">
          <h2 className="text-sm font-medium">Playground</h2>
          <p className="text-sm text-muted-foreground">Notes stay in this browser. Nothing here is sent to a model or saved to a client file.</p>
          <Textarea value={note} onChange={(event) => save(event.target.value)} rows={12} placeholder="A private note for this browser" />
        </section>
        <aside className="hidden flex-col gap-3 overflow-auto border-l p-4 xl:flex">
          <h2 className="text-sm font-medium">Guidance</h2>
          <p className="text-sm text-muted-foreground">Use the inbox reply when a client should see the message. Use a note on the file when it is only for the practice.</p>
          <p className="text-sm text-muted-foreground">Form 2848 and the engagement letter stay on the client file. This pane does not fill them.</p>
        </aside>
      </div>
    </div>
  );
}
