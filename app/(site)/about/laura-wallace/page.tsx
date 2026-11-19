import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { CoverImage } from "@/components/site-ui";
import { firm } from "@/lib/firm";
import { lauraPhoto } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Laura Wallace, EA",
  description:
    "Laura Wallace is an enrolled agent and leads TaxHelping2Day LLC, a private tax practice in Hamilton, Texas.",
  alternates: { canonical: "/about/laura-wallace" },
};

export default function LauraPage() {
  return (
    <SiteFrame
      eyebrow="Our firm"
      title="Laura Wallace, EA"
      lede="Laura Wallace leads TaxHelping2Day. She is an enrolled agent, licensed by the IRS, and she is the person responsible for the practice."
    >
      <div className="grid items-start gap-8 sm:grid-cols-[16rem_minmax(0,1fr)]">
        <CoverImage src={lauraPhoto.src} alt={lauraPhoto.alt} sizes="16rem" priority className="aspect-square rounded-3xl" />
        <div className="flex flex-col gap-6">
          <p className="text-pretty">
            Enrollment is a federal license. It authorizes Laura to prepare federal tax returns and to represent clients
            before the Internal Revenue Service. Clients of this practice work with her and her team, not with a rotating
            desk at a seasonal office.
          </p>
      <p className="text-pretty">
        If the IRS sends a notice, representation can be part of the engagement. You sign Form 2848 in the client
        portal, and our team submits it so Laura can speak for you. The scope of that work is written down before it
        begins.
      </p>
      <p className="text-pretty">
        To talk about a return, call{" "}
        <a className="text-accent" href={firm.phoneHref}>
          {firm.phone}
        </a>{" "}
        or email{" "}
        <a className="text-accent" href={`mailto:${firm.email}`}>
          {firm.email}
        </a>
        . More about the practice is on the{" "}
        <Link href="/about" className="text-accent">
          firm page
        </Link>
        .
      </p>
        </div>
      </div>
    </SiteFrame>
  );
}
