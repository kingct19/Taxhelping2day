import Link from "next/link";
import { clientTabHref, type ClientTab } from "@/lib/client-file";
import { cn } from "@/lib/utils";

export function ClientSummary({
  profileId,
  tab,
  cards,
}: {
  profileId: string;
  tab: ClientTab;
  cards: { tab: ClientTab; label: string; detail: string; count: number }[];
}) {
  return (
    <ol aria-label="Client file" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {cards.map((card) => {
        const active = card.tab === tab;
        return (
          <li key={card.label}>
            <Link
              href={clientTabHref(profileId, card.tab)}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn("flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 hover:bg-muted", active && "bg-muted")}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium",
                  card.count > 0 ? "bg-foreground/10 text-foreground ring-1 ring-foreground/30" : "bg-muted text-muted-foreground",
                )}
              >
                {card.count}
              </span>
              <span className="min-w-0">
                <span className={cn("block truncate text-sm", active && "font-medium")}>{card.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{card.detail}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
