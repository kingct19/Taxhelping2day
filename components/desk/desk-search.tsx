"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type DeskSearchItem = {
  href: string;
  label: string;
  group: string;
};

export function DeskSearch({ items }: { items: DeskSearchItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? items.filter((item) => `${item.label} ${item.group}`.toLowerCase().includes(needle)) : items;
  }, [items, query]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      const typing =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable);
      if (typing) return;
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || event.key === "/") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="hover:bg-primary/10 hover:text-primary"
              aria-label="Search"
              onClick={() => setOpen(true)}
            >
              <SearchIcon />
            </Button>
          }
        />
        <TooltipContent side="right">Search</TooltipContent>
      </Tooltip>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the desk" autoFocus />
          <ul className="flex max-h-80 flex-col gap-1 overflow-auto">
            {visible.length === 0 ? (
              <li className="px-2 py-3 text-sm text-muted-foreground">Nothing matches.</li>
            ) : (
              visible.map((item) => (
                <li key={item.href}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      router.push(item.href);
                    }}
                  >
                    <span>{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.group}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
