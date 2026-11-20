import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { SiteMobileNav } from "@/components/site-mobile-nav";
import { buttonPrimary } from "@/components/site-ui";
import { firm } from "@/lib/firm";
import { services } from "@/lib/site-content";

function SocialIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const links = [
  { href: "/about", label: "About" },
  { href: "/service-areas", label: "Service areas" },
  { href: "/resources", label: "Resources" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-6xl items-center gap-3 py-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:gap-6 sm:py-3 sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]">
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none">
          <Image src="/brand/logo.jpg" alt="" width={44} height={44} className="size-11 shrink-0 rounded-full" />
          <span className="truncate font-serif text-lg text-foreground sm:text-xl">{firm.name}</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-4 text-sm lg:flex xl:gap-6" aria-label="Primary">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
            Home
          </Link>
          <Link href="/about" className="text-muted-foreground hover:text-foreground">
            About
          </Link>
          <div className="group relative">
            <Link href="/services" className="text-muted-foreground hover:text-foreground">
              Services
            </Link>
            <div className="invisible absolute top-full left-0 z-20 w-64 pt-3 group-focus-within:visible group-hover:visible">
              <div className="flex flex-col rounded-xl border border-border bg-white p-2 shadow-sm">
                {services.map((service) => (
                  <Link key={service.slug} href={`/services/${service.slug}`} className="rounded-lg px-3 py-2 hover:bg-secondary">
                    {service.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          {links.slice(1).map((link) => (
            <Link key={link.href} href={link.href} className="text-muted-foreground hover:text-foreground">
              {link.label}
            </Link>
          ))}
          <a href={firm.phoneHref} className="whitespace-nowrap text-foreground">
            {firm.phone}
          </a>
          <Link href="/sign-in" className={`${buttonPrimary} shrink-0`}>
            Client portal
          </Link>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 lg:hidden">
          <a href={firm.phoneHref} className="inline-flex h-11 items-center rounded-md px-2 text-sm font-medium">
            Call
          </a>
          <SiteMobileNav />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <div className="border-t border-border bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 py-12 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:flex-row sm:justify-between sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Image src="/brand/logo.jpg" alt="" width={48} height={48} className="size-12 rounded-full" />
              <p className="font-serif text-2xl">{firm.name}</p>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {firm.mailingAddress}
              <br />
              {firm.city}, {firm.region} {firm.postalCode}
            </p>
            <a href={firm.phoneHref} className="font-serif text-2xl break-words">
              {firm.phone}
            </a>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Contact</p>
            <a href={`mailto:${firm.email}`} className="break-all">
              {firm.email}
            </a>
            <a href={firm.facebook} className="inline-flex items-center gap-2">
              <SocialIcon>
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </SocialIcon>
              Facebook
            </a>
            <a href={firm.instagram} className="inline-flex items-center gap-2">
              <SocialIcon>
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <path d="M17.5 6.5h.01" />
              </SocialIcon>
              Instagram
            </a>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Firm</p>
            <Link href="/about">About</Link>
            <Link href="/services">Services</Link>
            <Link href="/resources">Resources</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/disclaimer">Disclaimer</Link>
            <Link href="/photo-credits">Photo credits</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} {firm.legalName}
      </div>
    </footer>
  );
}
