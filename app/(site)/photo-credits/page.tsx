import type { Metadata } from "next";
import { SiteFrame } from "@/components/site-frame";
import { photoCredits } from "@/lib/photo-credits";

export const metadata: Metadata = {
  title: "Photo credits",
  description: "Photographers and licenses for the pictures on the TaxHelping2Day website.",
  alternates: { canonical: "/photo-credits" },
};

export default function PhotoCreditsPage() {
  return (
    <SiteFrame
      eyebrow="Firm"
      title="Photo credits"
      lede="These are photographs of real places and real work. They are not pictures of our clients or of our office."
    >
      <ul className="flex flex-col gap-5">
        {photoCredits.map((credit) => (
          <li key={credit.label} className="flex flex-col gap-1 border-t pt-5">
            <p className="font-medium">{credit.label}</p>
            <p className="text-muted-foreground">
              {credit.creator}.{" "}
              <a href={credit.licenseUrl}>{credit.license}</a>. Via{" "}
              <a href={credit.sourceUrl}>{credit.sourceLabel}</a>.
            </p>
          </li>
        ))}
      </ul>
    </SiteFrame>
  );
}
