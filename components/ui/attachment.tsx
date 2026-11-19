import type { ReactNode } from "react";
import { cn } from "cn";

export function Attachment({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex max-w-full items-center gap-2 rounded-lg border bg-card px-2 py-1.5", className)}>{children}</div>;
}

export function AttachmentMedia({ children }: { children: ReactNode }) {
  return <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">{children}</span>;
}

export function AttachmentContent({ children }: { children: ReactNode }) {
  return <div className="min-w-0">{children}</div>;
}

export function AttachmentTitle({ children }: { children: ReactNode }) {
  return <p className="truncate text-xs font-medium">{children}</p>;
}

export function AttachmentDescription({ children }: { children: ReactNode }) {
  return <p className="text-[10px] text-muted-foreground">{children}</p>;
}
