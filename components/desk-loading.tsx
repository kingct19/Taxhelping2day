import { LoaderCircleIcon } from "lucide-react";

export function DeskLoading() {
  return (
    <div className="flex h-full flex-1 items-center justify-center">
      <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
