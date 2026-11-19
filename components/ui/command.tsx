"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";

const CommandContext = createContext<{ query: string; setQuery: (value: string) => void } | null>(null);

export function useCommandQuery() {
  return useContext(CommandContext)?.query ?? "";
}

export function Command({ className, children }: { className?: string; children: ReactNode }) {
  const [query, setQuery] = useState("");
  return (
    <CommandContext.Provider value={{ query, setQuery }}>
      <div className={cn("flex flex-col overflow-hidden", className)}>{children}</div>
    </CommandContext.Provider>
  );
}

export function CommandInput({ placeholder }: { placeholder?: string }) {
  const context = useContext(CommandContext);
  return (
    <Input
      value={context?.query ?? ""}
      placeholder={placeholder}
      onChange={(event) => context?.setQuery(event.target.value)}
      className="h-9 rounded-none border-0 border-b shadow-none focus-visible:ring-0"
    />
  );
}

export function CommandList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("max-h-64 overflow-auto p-1", className)}>{children}</div>;
}

export function CommandEmpty({ children }: { children: ReactNode }) {
  return <p className="px-2 py-3 text-center text-xs text-muted-foreground">{children}</p>;
}

export function CommandGroup({ heading, children }: { heading?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      {heading ? <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{heading}</p> : null}
      {children}
    </div>
  );
}

export function CommandItem({
  className,
  children,
  onSelect,
}: {
  className?: string;
  children: ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={cn("flex w-full rounded-md px-2 py-1.5 text-left hover:bg-muted", className)}
      onClick={onSelect}
    >
      {children}
    </button>
  );
}
