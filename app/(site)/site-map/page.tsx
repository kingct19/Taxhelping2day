import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { areas, services } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Site map",
  description: "Every public page on the TaxHelping2Day website.",
  alternates: { canonical: "/site-map" },
};

const firmPages = [
  ["Home", "/"],
  ["Our firm", "/about"],
  ["Laura Wallace, EA", "/about/laura-wallace"],
  ["Security", "/security"],
  ["Contact", "/contact"],
  ["Resources", "/resources"],
  ["Tax center", "/resources/tax-center"],
  ["Questions", "/faq"],
  ["Privacy", "/privacy"],
  ["Terms of agreement", "/terms"],
  ["Disclaimer", "/disclaimer"],
  ["Photo credits", "/photo-credits"],
  ["Client portal", "/login"],
];

export default function SiteMapPage() {
  return (
    <SiteFrame eyebrow="Firm" title="Site map" lede="Public pages. The inbox, contacts, and client checklist are behind a sign-in and are not listed here.">
      <section className="flex flex-col gap-2">
        <h2 className="font-serif text-2xl">Firm</h2>
        {firmPages.map(([label, href]) => (
          <Link key={href} href={href} className="hover:text-accent">
            {label}
          </Link>
        ))}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-serif text-2xl">Services</h2>
        <Link href="/services" className="hover:text-accent">
          All services
        </Link>
        {services.map((service) => (
          <Link key={service.slug} href={`/services/${service.slug}`} className="hover:text-accent">
            {service.title}
          </Link>
        ))}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-serif text-2xl">Service areas</h2>
        <Link href="/service-areas" className="hover:text-accent">
          All service areas
        </Link>
        {areas.map((area) => (
          <Link key={area.slug} href={`/service-areas/${area.slug}`} className="hover:text-accent">
            {area.name}
          </Link>
        ))}
      </section>
    </SiteFrame>
  );
}
