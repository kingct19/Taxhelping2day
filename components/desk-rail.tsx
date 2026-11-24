"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
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

export function DeskRail({
  items,
  homeHref,
  search,
  inset = false,
  className,
}: {
  items: DeskItem[];
  homeHref: string;
  search: DeskSearchItem[];
  inset?: boolean;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex w-16 shrink-0 flex-col items-center bg-sidebar pb-3 text-sidebar-foreground",
          inset ? "my-2 ml-2 overflow-hidden rounded-xl" : "border-r border-sidebar-border",
          className,
        )}
      >
        <div className={cn("flex h-14 w-full items-center justify-center", !inset && "border-b border-sidebar-border")}>
          <Link href={homeHref} aria-label="TaxHelping2Day" className="flex size-9 items-center justify-center overflow-hidden rounded-md">
            <Image src="/brand/logo.jpg" alt="" width={36} height={36} className="size-9 object-cover" />
          </Link>
        </div>
        <nav className="flex flex-1 flex-col items-center gap-1 pt-2">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger
                  render={
                    <Link
                      href={item.href}
                      aria-label={item.label}
                      aria-current={active ? "page" : undefined}
                      className={itemClass(active)}
                    >
                      <Icon />
                    </Link>
                  }
                />
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
        <div className="flex flex-col items-center gap-1">
          <DeskSearch items={search} />
          <ThemeToggle />
          <UserButton />
        </div>
      </aside>
    </TooltipProvider>
  );
}
