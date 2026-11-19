import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { CoverImage } from "@/components/site-ui";
import { firm } from "@/lib/firm";
import { areas, lauraPhoto, practicePhoto } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Our firm",
  description:
    "TaxHelping2Day LLC is a private tax practice in Hamilton, Texas, led by Laura Wallace, an enrolled agent.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <SiteFrame
      eyebrow="Our firm"
      title="A private tax practice in Hamilton, Texas"
      lede={firm.mission}
      image={practicePhoto.src}
      imageAlt={practicePhoto.alt}
    >
      <div className="grid items-center gap-8 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <Link href="/about/laura-wallace">
          <CoverImage src={lauraPhoto.src} alt={lauraPhoto.alt} sizes="12rem" className="aspect-square rounded-3xl" />
        </Link>
        <p className="text-pretty">
          The practice is led by{" "}
          <Link href="/about/laura-wallace" className="text-accent">
            Laura Wallace, EA
          </Link>
          . She is licensed by the IRS to prepare federal returns and to represent taxpayers. Clients know who is
          responsible for the work.
        </p>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">Who we serve</h2>
        <p className="text-pretty">
          Individuals, businesses, and non-profits. A personal return, a set of books, and a Form 990 are different
          engagements. Each one begins with a conversation, a written scope, and a fee you can accept before we start.
        </p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">Where we serve</h2>
        <p className="text-pretty">
          From Hamilton, Texas, for clients in {areas.map((area) => area.name).join(", ")}. You will reach the same
          team on {firm.phone}, and your documents will live in one private portal.
        </p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">How to begin</h2>
        <p className="text-pretty">
          Call or write. We will tell you whether we can take the work and what it will cost. When you are ready, we
          invite you to the portal to complete your profile, sign the engagement, and send your records. You can also
          read how we{" "}
          <Link href="/security" className="text-accent">
            protect client information
          </Link>
          .
        </p>
      </section>
    </SiteFrame>
  );
}
