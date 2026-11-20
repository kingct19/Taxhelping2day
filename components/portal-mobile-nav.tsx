"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { FileSignatureIcon, FolderOpenIcon, InboxIcon, ScaleIcon, UserRoundIcon, type LucideIcon } from "lucide-react";
import { DeskSearch, type DeskSearchItem } from "@/components/desk/desk-search";
import { ThemeToggle } from "@/components/desk/theme-toggle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const tabs: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/portal", label: "Season", icon: InboxIcon },
  { href: "/portal/profile", label: "Profile", icon: UserRoundIcon },
  { href: "/portal/documents", label: "Documents", icon: FolderOpenIcon },
  { href: "/portal/engagement", label: "Letter", icon: FileSignatureIcon },
  { href: "/portal/poa", label: "Form 2848", icon: ScaleIcon },
];

function isActive(pathname: string, href: string) {
  if (href === "/portal") return pathname === "/portal";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalTopBar({ search }: { search: DeskSearchItem[] }) {
  return (
    <TooltipProvider>
      <header className="shrink-0 border-b border-sidebar-border bg-sidebar pt-[env(safe-area-inset-top)] md:hidden">
        <div className="flex h-14 items-center gap-2 px-3">
          <Link href="/portal" aria-label="TaxHelping2Day" className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md">
            <Image src="/brand/logo.jpg" alt="" width={36} height={36} className="size-9 object-cover" />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <DeskSearch items={search} />
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}

export function PortalTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="grid shrink-0 grid-cols-5 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Portal"
    >
      {tabs.map((tab) => {
        const active = isActive(pathname, tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-[11px] leading-tight",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5 shrink-0" />
            <span className="max-w-full text-balance">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
