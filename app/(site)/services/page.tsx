import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { CoverImage } from "@/components/site-ui";
import { services } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Tax preparation, bookkeeping, tax planning, and financial management for individuals, businesses, and non-profits.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <SiteFrame
      eyebrow="Our services"
      title="Books and taxes, from start to finish"
      lede="We prepare returns, keep books, and help you plan. Every engagement starts with a conversation, a written scope, and a fee agreed before the work begins."
    >
      <div className="flex flex-col gap-6">
        {services.map((service) => (
          <Link key={service.slug} href={`/services/${service.slug}`} className="group grid gap-5 border-t pt-6 no-underline md:grid-cols-[14rem_1fr] md:items-center">
            <CoverImage src={service.image} alt="" sizes="14rem" className="aspect-[16/10] rounded-2xl" />
            <span className="flex flex-col gap-3">
              <h2 className="font-serif text-2xl">{service.title}</h2>
              <p className="text-pretty text-muted-foreground">{service.summary}</p>
              <ul className="flex flex-col gap-1 text-sm text-foreground">
                {service.includes.map((item) => (
                  <li key={item.title}>{item.title}</li>
                ))}
              </ul>
            </span>
          </Link>
        ))}
      </div>
    </SiteFrame>
  );
}
