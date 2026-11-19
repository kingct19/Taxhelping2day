import type { Metadata } from "next";
import { SiteFrame } from "@/components/site-frame";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "What this website is, and what it is not, for TaxHelping2Day LLC.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <SiteFrame
      eyebrow="Firm"
      title="Disclaimer"
      lede="These pages introduce the practice. Advice for your return begins only after we have accepted the engagement in writing."
    >
      <p className="text-pretty">
        Tax results depend on your facts and on the year. The descriptions of state filing on this site are general.
        Your return may differ, and we will tell you how when we have your records.
      </p>
      <p className="text-pretty">
        TaxHelping2Day LLC is a private tax practice led by an enrolled agent. We are not a law firm and we are not an
        investment adviser. Links to IRS.gov and to state tax agencies leave this site. Those agencies publish the
        forms and the due dates.
      </p>
    </SiteFrame>
  );
}
