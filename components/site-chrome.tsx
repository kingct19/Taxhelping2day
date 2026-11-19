import Image from "next/image";
import Link from "next/link";
import { buttonPrimary } from "@/components/site-ui";
import { firm } from "@/lib/firm";
import { services } from "@/lib/site-content";

const links = [
  { href: "/about", label: "About" },
  { href: "/service-areas", label: "Service areas" },
  { href: "/resources", label: "Resources" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Image src="/brand/logo.jpg" alt="" width={44} height={44} className="size-11 rounded-full" />
          <span className="truncate font-serif text-xl text-foreground">{firm.name}</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-6 text-sm md:flex" aria-label="Primary">
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
          <a href={firm.phoneHref} className="hidden text-foreground lg:inline">
            {firm.phone}
          </a>
          <Link href="/sign-in" className={buttonPrimary}>
            Client portal
          </Link>
        </nav>

        <details className="relative ml-auto md:hidden">
          <summary className="cursor-pointer list-none rounded-md border border-border px-3 py-2 text-sm">Menu</summary>
          <div className="absolute top-full right-0 z-20 mt-2 flex w-64 flex-col rounded-xl border border-border bg-white p-2 shadow-sm">
            <Link href="/" className="rounded-lg px-3 py-2 hover:bg-secondary">
              Home
            </Link>
            <Link href="/about" className="rounded-lg px-3 py-2 hover:bg-secondary">
              About
            </Link>
            <Link href="/services" className="rounded-lg px-3 py-2 hover:bg-secondary">
              Services
            </Link>
            {services.map((service) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="rounded-lg px-3 py-2 pl-6 text-muted-foreground hover:bg-secondary">
                {service.title}
              </Link>
            ))}
            {links.slice(1).map((link) => (
              <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2 hover:bg-secondary">
                {link.label}
              </Link>
            ))}
            <a href={firm.phoneHref} className="rounded-lg px-3 py-2 hover:bg-secondary">
              {firm.phone}
            </a>
            <Link href="/sign-in" className={`${buttonPrimary} mt-1`}>
              Client portal
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <div className="border-t border-border bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 sm:flex-row sm:justify-between">
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
            <a href={firm.phoneHref} className="font-serif text-2xl">
              {firm.phone}
            </a>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Contact</p>
            <a href={`mailto:${firm.email}`}>{firm.email}</a>
            <a href={firm.facebook}>Facebook</a>
            <a href={firm.instagram}>Instagram</a>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Firm</p>
            <Link href="/about">About</Link>
            <Link href="/services">Services</Link>
            <Link href="/resources">Resources</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/disclaimer">Disclaimer</Link>
            <Link href="/photo-credits">Photo credits</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border bg-white px-6 py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {firm.legalName}
      </div>
    </footer>
  );
}
