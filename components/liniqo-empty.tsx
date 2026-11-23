import type { ReactNode } from "react";
import { liniqoMarkup } from "@/components/liniqo-markup";
import { cn } from "@/lib/utils";

function scene(id: string) {
  return { id };
}

export const liniqo = {
  liveChat: scene("live-chat-widget"),
  mailSorter: scene("budget-envelope-system"),
  taxDesk: scene("tax-office-stamp"),
  segment: scene("segment-builder-filters"),
  funnel: scene("funnel-conversion-stages"),
  ledger: scene("ledger-book-open"),
  noMatch: scene("empty-search-results"),
  checklist: scene("no-tasks-checklist"),
  taskPerson: scene("person-with-checklist"),
  contract: scene("contract-redlines"),
  archive: scene("law-books-shelf"),
  taxForm: scene("tax-form-stamp"),
  greeting: scene("person-waving-hello"),
  notice: scene("notification-fan-out-to-channels"),
  folder: scene("nda-confidential-folder"),
  sharedFolder: scene("shared-folder-with-members"),
} as const;

function scopedMarkup(id: string) {
  const raw = liniqoMarkup[id];
  if (!raw) return "";
  const scope = id.replace(/[^a-z0-9-]/g, "");
  return raw
    .replaceAll('id="float"', `id="float-${scope}"`)
    .replaceAll("#float{", `#float-${scope}{`)
    .replaceAll('id="hatch"', `id="hatch-${scope}"`)
    .replaceAll("url(#hatch)", `url(#hatch-${scope})`)
    .replaceAll("translateY(-16px)", "translateY(-8px)")
    .replace("<svg ", '<svg class="size-full overflow-visible" focusable="false" ');
}

export function LiniqoArt({ id, className }: { id: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("liniqo-art pointer-events-none block", className ?? "size-32")}
      dangerouslySetInnerHTML={{ __html: scopedMarkup(id) }}
    />
  );
}

export function LiniqoEmpty({
  id,
  title,
  children,
  className,
  artClassName,
}: {
  id: string;
  title?: string;
  children?: ReactNode;
  className?: string;
  artClassName?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-8 text-center", className)}>
      <LiniqoArt id={id} className={artClassName} />
      {title ? <p className="text-sm font-medium text-foreground">{title}</p> : null}
      {children ? <div className="max-w-sm text-sm text-balance text-muted-foreground [&_a]:underline [&_a]:underline-offset-4">{children}</div> : null}
    </div>
  );
}
