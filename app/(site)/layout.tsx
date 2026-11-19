import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { firm } from "@/lib/firm";
import { areas } from "@/lib/site-content";

const organization = {
  "@context": "https://schema.org",
  "@type": "AccountingService",
  name: firm.legalName,
  url: firm.url,
  image: `${firm.url}/brand/banner.jpg`,
  telephone: "+1-254-784-9272",
  email: firm.email,
  priceRange: "$$",
  description: firm.intro,
  address: {
    "@type": "PostalAddress",
    streetAddress: firm.mailingAddress,
    addressLocality: firm.city,
    addressRegion: firm.region,
    postalCode: firm.postalCode,
    addressCountry: "US",
  },
  areaServed: areas.map((area) => ({ "@type": "State", name: area.name })),
  founder: {
    "@type": "Person",
    name: "Laura Wallace",
    jobTitle: "Enrolled Agent",
  },
  sameAs: [firm.facebook, firm.instagram],
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
