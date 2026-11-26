"use client";

import { useState } from "react";
import { RememberLink } from "@/components/remember-view";
import { viewCookie } from "@/lib/view-cookie";
import { cn } from "@/lib/utils";

export type PortalReturnItem = {
  id: string;
  title: string;
  form: string;
  canceled?: boolean;
  need: number;
  review: number;
  complete: number;
};

function statusLine(item: PortalReturnItem): string {
  if (item.canceled) return "Canceled";
  const parts: string[] = [];
  if (item.need > 0) parts.push(`${item.need} need files`);
  if (item.review > 0) parts.push(`${item.review} under review`);
  if (item.complete > 0) parts.push(`${item.complete} complete`);
  return parts.length > 0 ? parts.join(" · ") : "No files yet";
}

export function ReturnList({ items, selectedId }: { items: PortalReturnItem[]; selectedId: string }) {
  const [pressed, setPressed] = useState<string | null>(null);
  const activeId = pressed && pressed !== selectedId ? pressed : selectedId;

  return (
    <aside className="grid h-fit gap-2 rounded-xl border bg-card p-2 lg:sticky lg:top-4">
      <p className="px-2 pt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Returns</p>
      <div className="grid gap-1">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <RememberLink
              key={item.id}
              view={viewCookie.portalReturn}
              value={item.id}
              href={`/portal/documents?return=${item.id}`}
              scroll={false}
              onClick={() => setPressed(item.id)}
              className={cn(
                "grid gap-0.5 rounded-lg px-3 py-2 text-left transition-colors duration-300 ease-out",
                active ? "bg-secondary" : "hover:bg-muted",
              )}
            >
              <span className="truncate text-sm font-medium">{item.title}</span>
              <span className="text-xs text-muted-foreground">Form {item.form}</span>
              <span className="text-xs text-muted-foreground">{statusLine(item)}</span>
            </RememberLink>
          );
        })}
      </div>
    </aside>
  );
}
