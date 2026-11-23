import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Crumb = {
  label: string;
  href?: string;
};

export function SubpageNav({
  backHref,
  backLabel,
  crumbs,
}: {
  backHref: string;
  backLabel: string;
  crumbs: Crumb[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1">
      <Link href={backHref} aria-label={backLabel} className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
        <ChevronLeftIcon />
      </Link>
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => {
          const current = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 ? <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
              {crumb.href && !current ? (
                <Link href={crumb.href} className="truncate text-muted-foreground hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <span className={cn("truncate", current ? "font-medium" : "text-muted-foreground")} aria-current={current ? "page" : undefined}>
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
