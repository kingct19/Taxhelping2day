import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { firm } from "@/lib/firm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Call, email, or write TaxHelping2Day LLC at PO Box 30, Hamilton, Texas.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <SiteFrame
      eyebrow="Contact"
      title="How can we help you?"
      lede="Tell us what you need. We will follow up with a time to talk and, if we are the right practice, a clear fee and an invitation to the client portal."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <a href={firm.phoneHref} className="flex flex-col gap-2 rounded-2xl border border-border bg-white p-5 text-foreground no-underline">
          <span className="text-xs font-medium tracking-[0.16em] text-accent uppercase">Call</span>
          <span className="font-serif text-2xl text-foreground">{firm.phone}</span>
        </a>
        <a href={`mailto:${firm.email}`} className="flex flex-col gap-2 rounded-2xl border border-border bg-white p-5 no-underline">
          <span className="text-xs font-medium tracking-[0.16em] text-accent uppercase">Email</span>
          <span className="font-serif text-lg leading-snug break-all text-foreground">{firm.email}</span>
        </a>
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-white p-5">
          <span className="text-xs font-medium tracking-[0.16em] text-accent uppercase">Mail</span>
          <span className="font-serif text-xl">
            {firm.mailingAddress}
            <br />
            {firm.city}, {firm.region} {firm.postalCode}
          </span>
        </div>
      </div>
      <p className="text-pretty">
        Current clients may <Link href="/login">sign in to the portal</Link>. If you are new, tell us the service you
        need and the state where you live or operate.
      </p>
    </SiteFrame>
  );
}
