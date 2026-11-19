import type { Metadata } from "next";
import { SiteFrame } from "@/components/site-frame";
import { areas } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Tax center",
  description: "Official IRS and state links for forms, refunds, due dates, and recordkeeping.",
  alternates: { canonical: "/resources/tax-center" },
};

const federal = [
  { href: "https://www.irs.gov/filing", label: "Filing", note: "Where the IRS explains how to file." },
  { href: "https://www.irs.gov/refunds", label: "Where’s My Refund", note: "The IRS tool for the status of a federal refund." },
  { href: "https://www.irs.gov/filing/individuals/when-to-file", label: "When to file", note: "The IRS calendar for individual returns." },
  { href: "https://www.irs.gov/forms-instructions", label: "Forms and instructions", note: "Current federal forms." },
  {
    href: "https://www.irs.gov/businesses/small-businesses-self-employed/how-long-should-i-keep-records",
    label: "How long to keep records",
    note: "IRS guidance on how long to keep tax records.",
  },
  {
    href: "https://www.irs.gov/tax-professionals/submit-forms-2848-and-8821-online",
    label: "Submit Form 2848 online",
    note: "Where a signed power of attorney is submitted to the IRS.",
  },
];

export default function TaxCenterPage() {
  return (
    <SiteFrame
      eyebrow="Resources"
      title="Tax center"
      lede="These links open the IRS and the state tax agencies in our service area. They publish the current forms, the filing calendar, and the rules for keeping records."
    >
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">Internal Revenue Service</h2>
        <ul className="flex flex-col gap-3">
          {federal.map((item) => (
            <li key={item.href}>
              <a className="text-accent" href={item.href}>
                {item.label}
              </a>
              <p className="text-muted-foreground">{item.note}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">State agencies we serve</h2>
        <ul className="flex flex-col gap-2">
          {areas.map((area) => (
            <li key={area.slug}>
              <a className="text-accent" href={area.agencyUrl}>
                {area.agencyName}
              </a>
              <span className="text-muted-foreground"> · {area.name}</span>
            </li>
          ))}
        </ul>
      </section>
    </SiteFrame>
  );
}
