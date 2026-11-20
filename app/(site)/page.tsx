import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buttonLight, buttonPrimary, CoverImage, SectionIntro, TextLink } from "@/components/site-ui";
import { firm } from "@/lib/firm";
import { areas, lauraPhoto, processPhoto, services, steps } from "@/lib/site-content";

export const metadata: Metadata = {
  title: { absolute: "TaxHelping2Day | Tax preparation and books, Hamilton, Texas" },
  description:
    "TaxHelping2Day is a private tax practice in Hamilton, Texas, led by Laura Wallace, Enrolled Agent. We prepare returns, keep books, and represent clients before the IRS.",
  alternates: { canonical: "/" },
};

const featuredSlugs = ["tax-preparation", "bookkeeping", "tax-planning"];
const audienceSlugs = ["individuals", "businesses", "nonprofits"];

function bySlug(slugs: string[]) {
  return slugs.flatMap((slug) => {
    const service = services.find((item) => item.slug === slug);
    return service ? [service] : [];
  });
}

const featured = bySlug(featuredSlugs);
const audiences = bySlug(audienceSlugs);

const reasons = [
  { title: "An enrolled agent", body: "Laura Wallace is licensed by the IRS to prepare returns and to represent you." },
  { title: "A written engagement", body: "You see the scope and the fee before any preparation begins." },
  { title: "A private portal", body: "Your records stay in a folder only you and our team can open." },
  { title: "One team", body: "Clients in eleven states work with the same practice in Hamilton." },
];

export default function HomePage() {
  return (
    <>
      <section className="bg-foreground text-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:py-20">
          <div className="flex max-w-3xl flex-col gap-6">
            <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">{firm.serviceLine}</p>
            <h1 className="font-serif text-4xl leading-[1.08] text-balance md:text-6xl">
              Trusted tax preparation in Hamilton, Texas
            </h1>
            <p className="max-w-xl text-lg leading-8 text-pretty text-background/75">
              A private practice led by Laura Wallace, Enrolled Agent. We prepare returns, keep the books, and stand
              with you if the IRS has a question.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/contact" className={buttonPrimary}>
                Get in contact
              </Link>
              <a href={firm.phoneHref} className={buttonLight}>
                Call {firm.phone}
              </a>
            </div>
          </div>
          <div className="relative aspect-video w-full overflow-hidden rounded-3xl">
            <Image
              src="/brand/banner.jpg"
              alt="TaxHelping2Day desk with the firm name, phone, and website"
              fill
              priority
              className="object-contain"
              sizes="(min-width: 1152px) 72rem, 100vw"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 sm:px-6 md:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-16">
          <Link href="/about/laura-wallace" className="group flex flex-col gap-4">
            <CoverImage
              src={lauraPhoto.src}
              alt={lauraPhoto.alt}
              sizes="18rem"
              className="aspect-square rounded-3xl"
            />
            <span className="flex flex-col gap-1">
              <span className="font-serif text-2xl text-foreground">Laura Wallace, EA</span>
              <span className="text-sm text-muted-foreground">Enrolled Agent, Hamilton, Texas</span>
            </span>
          </Link>
          <SectionIntro
            eyebrow="Our practice"
            title="Where personal care meets a careful return"
            lede={firm.mission}
            action={
              <Link href="/about" className={`${buttonPrimary} whitespace-nowrap`}>
                More about us
              </Link>
            }
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {audiences.map((service) => (
            <Link key={service.slug} href={`/services/${service.slug}`} className="group overflow-hidden rounded-2xl border border-border bg-white hover:border-accent">
              <CoverImage src={service.image} alt="" sizes="(min-width: 768px) 30vw, 100vw" className="aspect-[16/10]" />
              <div className="flex flex-col gap-3 p-6">
                <h3 className="font-serif text-2xl">{service.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{service.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 md:py-24">
          <SectionIntro
            eyebrow="Services"
            title="Services tailored to your needs"
            lede="Personal returns, business books, and planning through the year. Start with the work in front of you."
            action={<TextLink href="/services">View all services</TextLink>}
          />
          <div className="grid gap-4 md:grid-cols-3">
            {featured.map((service, index) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background hover:border-accent">
                <div className="relative">
                  <CoverImage src={service.image} alt="" sizes="(min-width: 768px) 30vw, 100vw" className="aspect-[16/10]" />
                  <span className="absolute top-4 left-4 rounded-full bg-background/90 px-3 py-1 font-serif text-sm text-primary">0{index + 1}</span>
                </div>
                <div className="flex h-full flex-col gap-4 p-6">
                  <h3 className="font-serif text-2xl">{service.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{service.summary}</p>
                  <span className="mt-auto text-sm font-medium text-accent">Learn more</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 md:py-24">
        <SectionIntro eyebrow="Why clients stay" title="Why families and businesses trust us" />
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((reason, index) => (
            <div key={reason.title} className="flex flex-col gap-3 bg-background p-6">
              <span className="font-serif text-sm text-primary">0{index + 1}</span>
              <h3 className="font-serif text-xl">{reason.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">{reason.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 md:py-20">
          <SectionIntro
            eyebrow="Service area"
            title="Where we work"
            lede="Our office is in Hamilton. Clients across these states work with the same team."
            action={<TextLink href="/service-areas">All service areas</TextLink>}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {areas.map((area) => (
              <Link key={area.slug} href={`/service-areas/${area.slug}`} className="group relative overflow-hidden rounded-2xl">
                <CoverImage src={area.image} alt="" sizes="(min-width: 1024px) 22vw, 50vw" className="aspect-[4/3]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-3 text-white sm:p-4">
                  <span className="font-serif text-lg leading-tight text-balance sm:text-xl">{area.name}</span>
                  {area.home ? <span className="text-xs tracking-[0.16em] text-primary uppercase">Office</span> : null}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[0.85fr_1.15fr]">
        <CoverImage
          src={processPhoto.src}
          alt={processPhoto.alt}
          sizes="(min-width: 1024px) 32rem, 100vw"
          className="aspect-[16/10] rounded-3xl lg:sticky lg:top-24 lg:aspect-[4/5]"
        />
        <div className="flex flex-col gap-10">
          <SectionIntro eyebrow="How we work" title="From the first call to a filed return" />
          <ol className="grid gap-8 sm:grid-cols-2">
            {steps.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-3 border-t-2 border-primary pt-4">
                <span className="font-serif text-sm text-primary">0{index + 1}</span>
                <h3 className="font-serif text-xl">{step.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-foreground text-background">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:py-20">
          <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Contact</p>
          <h2 className="font-serif text-4xl text-balance md:text-5xl">How can we help you?</h2>
          <p className="max-w-xl text-lg leading-8 text-background/75">
            Call or write. We will tell you whether we can take the work, and what it will cost, before anything begins.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a href={firm.phoneHref} className="max-w-full font-serif text-2xl break-words text-primary sm:text-3xl">
              {firm.phone}
            </a>
            <Link href="/contact" className={buttonPrimary}>
              Get in contact
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
