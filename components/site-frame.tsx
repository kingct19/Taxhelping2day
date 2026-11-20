import Link from "next/link";
import { buttonPrimary, CoverImage } from "@/components/site-ui";
import { services } from "@/lib/site-content";

export function SiteFrame({
  eyebrow,
  title,
  lede,
  image,
  imageAlt,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  image?: string;
  imageAlt?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="border-b border-white/10 bg-foreground text-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6 md:py-20">
          <div className="flex flex-col gap-4">
            {eyebrow ? <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">{eyebrow}</p> : null}
            <h1 className="max-w-3xl font-serif text-4xl leading-[1.1] text-balance md:text-5xl">{title}</h1>
            {lede ? <p className="max-w-2xl text-lg leading-8 text-pretty text-background/75">{lede}</p> : null}
          </div>
          {image ? (
            <CoverImage
              src={image}
              alt={imageAlt ?? ""}
              sizes="(min-width: 1152px) 72rem, 100vw"
              className="aspect-[16/7] rounded-3xl"
              priority
            />
          ) : null}
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <article className="site-copy flex min-w-0 flex-col gap-10">{children}</article>
        <aside className="h-fit rounded-2xl border border-border bg-white p-5 lg:sticky lg:top-24">
          <p className="font-serif text-lg">Services</p>
          <div className="mt-3 flex flex-col gap-1">
            {services.map((service) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
                {service.title}
              </Link>
            ))}
          </div>
          <Link href="/contact" className={`${buttonPrimary} mt-5 w-full`}>
            Get in contact
          </Link>
        </aside>
      </div>
    </div>
  );
}
