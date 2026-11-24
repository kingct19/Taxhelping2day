"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusIcon, type LucideIcon } from "lucide-react";
import { DeskAccount } from "@/components/desk-account";
import { DeskSearch, type DeskSearchItem } from "@/components/desk/desk-search";
import { ThemeToggle } from "@/components/desk/theme-toggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type NotchDestination = { href: string; label: string; icon: LucideIcon; badge?: number };
export type NotchAction = { href: string; label: string };

function isActive(pathname: string, href: string) {
  if (href === "/portal") return pathname === "/portal";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DeskNotch({
  label,
  destinations,
  actions,
  search,
  avatarUrl = null,
}: {
  label: string;
  destinations: NotchDestination[];
  actions: NotchAction[];
  search: DeskSearchItem[];
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  function setOpen(next: boolean) {
    setOpenPath(next ? pathname : null);
  }

  return (
    <TooltipProvider>
      <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-6 z-50 md:hidden">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                aria-label={open ? "Close" : "Menu"}
                className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-[3px] rounded-xl text-background outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
              />
            }
          >
            <span className="inline-flex h-[28.8px] items-center rounded-full bg-foreground px-[12.6px] text-[11.7px] leading-none font-medium">
              Menu
            </span>
            <span className="inline-flex size-[28.8px] items-center justify-center rounded-lg bg-foreground">
              <PlusIcon className={cn("size-[14.4px] transition-transform duration-200", open && "rotate-45")} />
            </span>
          </PopoverTrigger>
          <PopoverContent
            aria-label={label}
            align="start"
            side="top"
            sideOffset={8}
            className="z-[70] w-56 gap-0 rounded-xl bg-popover p-1.5 shadow-lg ring-inset ring-border/70"
          >
            <nav aria-label={label} className="flex max-h-[min(24rem,70dvh)] flex-col gap-0.5 overflow-auto">
              {destinations.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 text-sm hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2",
                      active ? "bg-secondary text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="size-6 shrink-0" />
                    <span>{item.label}</span>
                    {item.badge ? (
                      <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-medium text-primary-foreground">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    ) : active ? (
                      <span aria-hidden="true" className="ml-auto size-1 rounded-full bg-primary" />
                    ) : null}
                  </Link>
                );
              })}
              {actions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2"
                >
                  {action.label}
                </Link>
              ))}
              <div className="mt-0.5 flex items-center gap-1 border-t border-border px-1 pt-1.5">
                <DeskSearch items={search} />
                <ThemeToggle />
                <span className="ml-auto">
                  <DeskAccount avatarUrl={avatarUrl} />
                </span>
              </div>
            </nav>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
}
