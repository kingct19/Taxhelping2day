import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFrame } from "@/components/site-frame";
import { firm } from "@/lib/firm";
import { areas, documentsToBring, getArea, services, steps } from "@/lib/site-content";

export function generateStaticParams() {
  return areas.map((area) => ({ slug: area.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const area = getArea(slug);
  if (!area) {
    return {};
  }
  return {
    title: `Tax preparation in ${area.name}`,
    description: area.summary,
    alternates: { canonical: `/service-areas/${area.slug}` },
  };
}

export default async function ServiceAreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const area = getArea(slug);
  if (!area) {
    notFound();
  }

  const place = {
    "@context": "https://schema.org",
    "@type": "AccountingService",
    name: `${firm.legalName} — ${area.name}`,
    url: `${firm.url}/service-areas/${area.slug}`,
    telephone: "+1-254-784-9272",
    areaServed: { "@type": "State", name: area.name },
    address: {
      "@type": "PostalAddress",
      streetAddress: firm.mailingAddress,
      addressLocality: firm.city,
      addressRegion: firm.region,
      postalCode: firm.postalCode,
      addressCountry: "US",
    },
  };

  return (
    <SiteFrame
      eyebrow="Service area"
      title={`Tax preparation in ${area.name}`}
      lede={area.summary}
      image={area.image}
      imageAlt={area.imageAlt}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(place) }} />
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">How {area.name} filing works</h2>
        <p className="text-pretty">{area.filing}</p>
        <p className="text-pretty">{area.focus}</p>
      </section>
      <section className="flex flex-col gap-6">
        <h2 className="font-serif text-2xl">What we offer {area.name} clients</h2>
        {services.map((service) => (
          <div key={service.slug} className="flex flex-col gap-3 border-t pt-6">
            <h3 className="font-serif text-xl">
              <Link href={`/services/${service.slug}`} className="hover:text-accent">
                {service.title}
              </Link>
            </h3>
            <p className="text-pretty">{service.summary}</p>
            <ul className="flex flex-col gap-2">
              {service.includes.map((item) => (
                <li key={item.title}>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">How an engagement begins</h2>
        <p className="text-pretty">{area.local}</p>
        <ol className="flex flex-col gap-4">
          {steps.map((step, index) => (
            <li key={step.title}>
              <p className="font-medium">
                0{index + 1} {step.title}
              </p>
              <p className="text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">What to have ready</h2>
        <ul className="flex flex-col gap-3">
          {documentsToBring.map((item) => (
            <li key={item.name}>
              <p className="font-medium">{item.name}</p>
              <p className="text-muted-foreground">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-pretty">
        Forms and instructions for this state are published by the{" "}
        <a className="text-accent" href={area.agencyUrl}>
          {area.agencyName}
        </a>
        . Federal forms are published by the{" "}
        <a className="text-accent" href="https://www.irs.gov/forms-instructions">
          IRS
        </a>
        . We prepare the returns in your engagement and review them with you before filing.
      </p>
      <p>
        Call <a className="text-accent" href={firm.phoneHref}>{firm.phone}</a> or{" "}
        <Link href="/contact" className="text-accent">
          write to us
        </Link>
        .
      </p>
    </SiteFrame>
  );
}
