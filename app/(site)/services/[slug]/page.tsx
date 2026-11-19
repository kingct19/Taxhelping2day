import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFrame } from "@/components/site-frame";
import { getService, services } from "@/lib/site-content";

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) {
    return {};
  }
  return {
    title: service.title,
    description: service.summary,
    alternates: { canonical: `/services/${service.slug}` },
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) {
    notFound();
  }

  return (
    <SiteFrame eyebrow="Services" title={service.title} lede={service.lede} image={service.image} imageAlt={service.imageAlt}>
      {service.sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-3">
          <h2 className="font-serif text-2xl">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-pretty">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">What this includes</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {service.includes.map((item) => (
            <li key={item.title} className="flex flex-col gap-2 rounded-2xl border border-border bg-white p-5">
              <p className="font-medium">{item.title}</p>
              <p className="text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>
      <p>
        <Link href="/contact" className="text-accent">
          Call or email to schedule a conversation
        </Link>
        . Current clients can{" "}
        <Link href="/login" className="text-accent">
          open the client portal
        </Link>
        .
      </p>
    </SiteFrame>
  );
}
