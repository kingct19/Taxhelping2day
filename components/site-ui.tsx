import Image from "next/image";
import Link from "next/link";

export const buttonPrimary =
  "inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80";

export const buttonLight =
  "inline-flex items-center justify-center rounded-md border border-white/40 px-5 py-2.5 text-sm text-white transition-colors hover:bg-white hover:text-foreground";

export const buttonDark =
  "inline-flex items-center justify-center rounded-md bg-foreground px-5 py-2.5 text-sm text-background transition-colors hover:bg-foreground/85";

export function SectionIntro({
  eyebrow,
  title,
  lede,
  action,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
      <div className="flex max-w-2xl flex-col gap-3">
        <p className="text-xs font-medium tracking-[0.2em] text-accent uppercase">{eyebrow}</p>
        <h2 className="font-serif text-3xl leading-tight text-balance md:text-4xl">{title}</h2>
        {lede ? <p className="text-pretty leading-7 text-muted-foreground">{lede}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CoverImage({
  src,
  alt,
  sizes,
  priority = false,
  className = "aspect-[16/10]",
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image src={src} alt={alt} fill priority={priority} className="object-cover transition duration-500 group-hover:scale-[1.03]" sizes={sizes} />
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm font-medium text-accent hover:underline">
      {children}
    </Link>
  );
}
