"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { buttonPrimary } from "@/components/site-ui";
import { firm } from "@/lib/firm";
import { services } from "@/lib/site-content";

const links = [
  { href: "/service-areas", label: "Service areas" },
  { href: "/resources", label: "Resources" },
  { href: "/contact", label: "Contact" },
];

const itemClass = "flex min-h-11 items-center rounded-lg px-3 text-base hover:bg-secondary";

export function SiteMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function close() {
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-11 shrink-0 items-center rounded-md border border-border px-3 text-sm">
        Menu
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-none gap-0 p-0 sm:max-w-none">
        <SheetHeader className="border-b border-border pr-12">
          <SheetTitle className="font-serif text-lg">Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" aria-label="Mobile">
          <Link href="/" className={itemClass} onClick={close}>
            Home
          </Link>
          <Link href="/about" className={itemClass} onClick={close}>
            About
          </Link>
          <Link href="/services" className={itemClass} onClick={close}>
            Services
          </Link>
          {services.map((service) => (
            <Link key={service.slug} href={`/services/${service.slug}`} className={`${itemClass} pl-8 text-sm text-muted-foreground`} onClick={close}>
              {service.title}
            </Link>
          ))}
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={itemClass} onClick={close}>
              {link.label}
            </Link>
          ))}
          <a href={firm.phoneHref} className={itemClass} onClick={close}>
            {firm.phone}
          </a>
          <Link href="/sign-in" className={`${buttonPrimary} mt-2 min-h-11`} onClick={close}>
            Client portal
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
