"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "cn";

export function InputGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        "flex h-8 w-full min-w-0 items-center rounded-lg border border-input bg-transparent px-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}

export function InputGroupAddon({ children }: { children: ReactNode }) {
  return <span className="mr-2 flex shrink-0 items-center text-muted-foreground">{children}</span>;
}

export function InputGroupInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input-group-control"
      className={cn("h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground", className)}
      {...props}
    />
  );
}
