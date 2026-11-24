"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { CircleHelpIcon, LogOutIcon, SettingsIcon, UserRoundIcon } from "lucide-react";
import { DeskSearch, type DeskSearchItem } from "@/components/desk/desk-search";
import { ThemeToggle } from "@/components/desk/theme-toggle";
import type { DeskItem } from "@/components/desk-rail";
import { PortalAvatar } from "@/components/portal/portal-avatar";
import { useMediaQuery } from "@/hooks/use-media-query";
import { buttonVariants } from "@/components/ui/button-variants";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type PortalAccount = {
  id: string;
  name: string;
  email: string;
  avatarPath: string | null;
};

function isActive(pathname: string, href: string) {
  if (href === "/portal") return pathname === "/portal";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalRail({
  items,
  account,
  search,
  helpEmail,
}: {
  items: DeskItem[];
  account: PortalAccount;
  search: DeskSearchItem[];
  helpEmail: string;
}) {
  const pathname = usePathname();
  const wide = useMediaQuery("(min-width: 1180px)");
  const labeled = wide;

  return (
    <TooltipProvider>
      <aside className={cn("my-2 ml-2 hidden shrink-0 flex-col overflow-hidden rounded-xl bg-sidebar py-3 text-sidebar-foreground md:flex", labeled ? "w-56 px-2" : "w-16 items-center")}>
        <Link href="/portal" className={cn("flex h-12 items-center gap-2 rounded-md px-1", !labeled && "justify-center")}>
          <Image src="/brand/logo.jpg" alt="" width={32} height={32} priority className="size-8 rounded-md object-cover" />
          {labeled ? <span className="truncate text-sm font-medium">Client portal</span> : <span className="sr-only">Client portal</span>}
        </Link>
        <nav className={cn("mt-3 flex flex-1 flex-col gap-0.5", !labeled && "items-center")}>
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            const link = (
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  buttonVariants({ variant: "ghost", size: labeled ? "default" : "icon" }),
                  "relative text-sidebar-foreground transition-colors",
                  labeled ? "h-9 w-full justify-start gap-2 px-2 font-normal" : "size-9",
                  active ? "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary" : "hover:bg-primary/10 hover:text-primary",
                )}
              >
                <Icon />
                {labeled ? <span className="truncate">{item.label}</span> : <span className="sr-only">{item.label}</span>}
                {labeled && item.badge ? (
                  <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-medium text-primary-foreground">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
                {!labeled && item.badge ? <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" /> : null}
              </Link>
            );
            if (labeled) return <div key={item.href} className="relative">{link}</div>;
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger render={<span className="relative">{link}</span>} />
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
        <div className={cn("mt-2 flex flex-col gap-1 border-t border-sidebar-border pt-2", labeled ? "px-1" : "items-center")}>
          <div className={cn("flex items-center gap-1", labeled ? "justify-between" : "flex-col")}>
            <DeskSearch items={search} />
            <ThemeToggle />
          </div>
          <Popover>
            <PopoverTrigger
              className={cn(
                "flex items-center gap-2 rounded-lg p-1 text-left hover:bg-primary/10",
                labeled ? "w-full" : "justify-center",
              )}
              aria-label="Account"
            >
              <PortalAvatar id={account.id} name={account.name} email={account.email} avatarPath={account.avatarPath} />
              {labeled ? (
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{account.name || "Your account"}</span>
                  <span className="block truncate text-xs text-muted-foreground">{account.email}</span>
                </span>
              ) : null}
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-52 gap-0.5 p-1.5">
              <Link href="/portal/profile" className="flex h-9 items-center gap-2 rounded-md px-2 text-sm hover:bg-muted">
                <UserRoundIcon className="size-4" /> Profile
              </Link>
              <Link href="/portal/settings" className="flex h-9 items-center gap-2 rounded-md px-2 text-sm hover:bg-muted">
                <SettingsIcon className="size-4" /> Settings
              </Link>
              <a href={`mailto:${helpEmail}`} className="flex h-9 items-center gap-2 rounded-md px-2 text-sm hover:bg-muted">
                <CircleHelpIcon className="size-4" /> Help
              </a>
              <SignOutButton>
                <button type="button" className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm hover:bg-muted">
                  <LogOutIcon className="size-4" /> Sign out
                </button>
              </SignOutButton>
            </PopoverContent>
          </Popover>
        </div>
      </aside>
    </TooltipProvider>
  );
}
