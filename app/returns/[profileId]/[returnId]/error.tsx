"use client";

import { Button } from "@/components/ui/button";

export default function ReturnError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="m-6 grid max-w-lg gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
      <p>{error.message || "This return could not be opened."}</p>
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => reset()}>Try again</Button>
    </div>
  );
}
