import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { documentsToBring, steps } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Resources",
  description: "What to gather before a TaxHelping2Day engagement, and how the client portal is used.",
  alternates: { canonical: "/resources" },
};

export default function ResourcesPage() {
  return (
    <SiteFrame
      eyebrow="Resources"
      title="What to gather before we start"
      lede="A complete set of records lets us prepare the return carefully and review it with you. This is what we ask clients to gather."
    >
      <ul className="flex flex-col gap-3">
        {documentsToBring.map((item) => (
          <li key={item.name}>
            <p className="font-medium">{item.name}</p>
            <p className="text-muted-foreground">{item.detail}</p>
          </li>
        ))}
      </ul>
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">Once we have agreed to work together</h2>
        <ol className="flex flex-col gap-3">
          {steps.map((step) => (
            <li key={step.title}>
              <p className="font-medium">{step.title}</p>
              <p className="text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
      <p>
        Official dates, forms, and recordkeeping guidance are collected on the{" "}
        <Link href="/resources/tax-center" className="text-accent">
          tax center
        </Link>
        .
      </p>
    </SiteFrame>
  );
}
