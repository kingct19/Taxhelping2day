"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DeskAccount } from "@/components/desk-account";
import type { LucideIcon } from "lucide-react";
import { DeskSearch, type DeskSearchItem } from "@/components/desk/desk-search";
import { ThemeToggle } from "@/components/desk/theme-toggle";
import { buttonVariants } from "@/components/ui/button-variants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type DeskItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

function isActive(pathname: string, href: string) {
  if (href === "/portal") return pathname === "/portal";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const itemClass = (active: boolean) =>
  cn(
    buttonVariants({ variant: "ghost", size: "icon-lg" }),
    "relative rounded-md border-0 text-sidebar-foreground transition-colors",
    active
      ? "bg-primary/10 text-primary before:absolute before:top-1/2 before:-left-2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary hover:bg-primary/10 hover:text-primary"
      : "hover:bg-primary/10 hover:text-primary",
  );

const labeledClass = (active: boolean) =>
  cn(
    buttonVariants({ variant: "ghost", size: "default" }),
    "h-9 w-full justify-start gap-2 px-2 font-normal text-sidebar-foreground",
    active ? "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary" : "hover:bg-primary/10 hover:text-primary",
  );

function badgeLabel(count: number) {
  return count > 9 ? "9+" : String(count);
}

export function DeskRail({
  items,
  homeHref,
  search,
  avatarUrl = null,
  inset = false,
  labeled = false,
  className,
}: {
  items: DeskItem[];
  homeHref: string;
  search: DeskSearchItem[];
  avatarUrl?: string | null;
  inset?: boolean;
  labeled?: boolean;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex shrink-0 flex-col bg-sidebar pb-3 text-sidebar-foreground",
          labeled ? "w-52 items-stretch px-2" : "w-16 items-center",
          inset ? "my-2 ml-2 overflow-hidden rounded-xl" : "border-r border-sidebar-border",
          className,
        )}
      >
        <div className={cn("flex h-14 w-full items-center", labeled ? "px-1" : "justify-center", !inset && "border-b border-sidebar-border")}>
          <Link href={homeHref} aria-label="TaxHelping2Day" className="flex size-9 items-center justify-center overflow-hidden rounded-md">
            <Image src="/brand/logo.jpg" alt="" width={36} height={36} className="size-9 object-cover" />
          </Link>
        </div>
        <nav className={cn("flex flex-1 flex-col gap-1 pt-2", labeled ? "items-stretch" : "items-center")}>
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            const link = (
              <Link
                href={item.href}
                aria-label={labeled ? undefined : item.label}
                aria-current={active ? "page" : undefined}
                className={labeled ? labeledClass(active) : itemClass(active)}
              >
                <Icon />
                {labeled ? <span className="truncate">{item.label}</span> : null}
                {!labeled && item.badge ? <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" /> : null}
                {labeled && item.badge ? (
                  <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-medium text-primary-foreground">
                    {badgeLabel(item.badge)}
                  </span>
                ) : null}
              </Link>
            );
            if (labeled) return <div key={item.href}>{link}</div>;
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger render={link} />
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
        <div className={cn("flex gap-1", labeled ? "flex-row items-center px-1" : "flex-col items-center")}>
          <DeskSearch items={search} />
          <ThemeToggle />
          <span className={labeled ? "ml-auto" : undefined}>
            <DeskAccount avatarUrl={avatarUrl} />
          </span>
        </div>
      </aside>
    </TooltipProvider>
  );
}
