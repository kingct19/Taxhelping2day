import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { CoverImage } from "@/components/site-ui";
import { areas } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Service areas",
  description:
    "TaxHelping2Day serves clients in Texas, Oklahoma, Arkansas, Alabama, Tennessee, Kansas, Florida, Arizona, Virginia, New York, and California from Hamilton, Texas.",
  alternates: { canonical: "/service-areas" },
};

export default function ServiceAreasPage() {
  return (
    <SiteFrame
      eyebrow="Service areas"
      title="Eleven states, one standard of care"
      lede="Our office is in Hamilton, Texas. Clients in these states work with the same enrolled agent and the same team, by phone and through a private portal."
    >
      <div className="grid gap-8 sm:grid-cols-2">
        {areas.map((area) => (
          <Link key={area.slug} href={`/service-areas/${area.slug}`} className="group flex flex-col gap-3 no-underline">
            <span className="relative block">
              <CoverImage src={area.image} alt="" sizes="(min-width: 768px) 24rem, 100vw" className="aspect-[16/10] rounded-2xl" />
              {area.home ? (
                <span className="absolute top-4 left-4 rounded-full bg-background/90 px-3 py-1 text-xs tracking-[0.16em] text-accent uppercase">
                  Office
                </span>
              ) : null}
            </span>
            <span className="font-serif text-2xl text-foreground">{area.name}</span>
            <span className="text-pretty text-sm leading-6 text-muted-foreground">{area.summary}</span>
          </Link>
        ))}
      </div>
    </SiteFrame>
  );
}
