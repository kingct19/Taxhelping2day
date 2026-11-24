import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { NewContactDialog } from "@/components/contacts/new-contact-dialog";
import { LiniqoEmpty, liniqo } from "@/components/liniqo-empty";
import { ContactRowActions } from "@/components/contacts/contact-row-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { getStore } from "@/lib/store";
import { avatarUrl } from "@/lib/avatar";
import { taxpayerTypeLabel, taxpayerTypes, type TaxpayerType } from "@/lib/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Segment = "all" | TaxpayerType;

function isSegment(value: string): value is Segment {
  return value === "all" || taxpayerTypes.some((type) => type === value);
}

function segmentLabel(segment: Segment) {
  switch (segment) {
    case "all":
      return "All contacts";
    case "individual":
    case "business":
    case "nonprofit":
      return taxpayerTypeLabel(segment);
    default: {
      const exhaustive: never = segment;
      return exhaustive;
    }
  }
}

function typeTone(type: TaxpayerType) {
  switch (type) {
    case "individual":
      return "info" as const;
    case "business":
      return "attention" as const;
    case "nonprofit":
      return "accent" as const;
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

function initials(name: string, email: string) {
  const letters = (name.trim() || email)
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "?";
}

function emailDomain(email: string) {
  return email.split("@")[1] ?? "—";
}

function locationOf(city: string, state: string) {
  const place = [city, state].filter(Boolean).join(", ");
  return place || "—";
}

const segments: Segment[] = ["all", ...taxpayerTypes];

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ segment?: string }> }) {
  await requireProfile("staff");
  const { segment: segmentQuery } = await searchParams;
  const segment = segmentQuery && isSegment(segmentQuery) ? segmentQuery : "all";
  const store = getStore();
  const profiles = await store.listProfiles();
  const rows = profiles.filter((profile) => profile.role === "client");
  const visible = rows.filter((client) => {
    switch (segment) {
      case "all":
        return true;
      case "individual":
      case "business":
      case "nonprofit":
        return client.taxpayerType === segment;
      default: {
        const exhaustive: never = segment;
        return exhaustive;
      }
    }
  });

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-14 shrink-0 items-center border-b px-4">
          <h1 className="text-base font-semibold">Contacts</h1>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {segments.map((item) => {
            const active = item === segment;
            const count = rows.filter((client) => {
              switch (item) {
                case "all":
                  return true;
                case "individual":
                case "business":
                case "nonprofit":
                  return client.taxpayerType === item;
                default: {
                  const exhaustive: never = item;
                  return exhaustive;
                }
              }
            }).length;
            return (
              <Link
                key={item}
                href={item === "all" ? "/contacts" : `/contacts?segment=${item}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  buttonVariants({ variant: active ? "secondary" : "ghost", size: "lg" }),
                  "h-9 justify-start gap-2 border-0 font-normal",
                )}
              >
                <span className="flex-1 truncate text-left">{segmentLabel(item)}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{segmentLabel(segment)}</h2>
            <p className="text-xs text-muted-foreground">
              {visible.length} {visible.length === 1 ? "person" : "people"}
            </p>
          </div>
          <div className="ml-auto">
            <NewContactDialog />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="p-4">
            <Card>
              <CardContent>
                {visible.length === 0 ? (
                  <LiniqoEmpty {...liniqo.segment}>No contacts in this segment.</LiniqoEmpty>
                ) : (
                  <ul>
                    <li className="hidden grid-cols-[minmax(0,1.3fr)_7.5rem_7rem_8rem_8rem_7.5rem_auto] items-center gap-3 border-b px-1 pb-2 text-xs text-muted-foreground lg:grid">
                      <span>Name</span>
                      <span>Type</span>
                      <span>Phone</span>
                      <span>Domain</span>
                      <span>Location</span>
                      <span>Added</span>
                      <span className="sr-only">Actions</span>
                    </li>
                    {visible.map((client) => {
                      const photo = avatarUrl(client.id, client.avatarPath);
                      return (
                      <li key={client.id} className="border-b py-3 last:border-b-0">
                        <div className="grid items-center gap-3 lg:grid-cols-[minmax(0,1.3fr)_7.5rem_7rem_8rem_8rem_7.5rem_auto]">
                          <Link href={`/contacts/${client.id}`} className="flex min-w-0 items-center gap-3">
                            <Avatar className="size-9">
                              {photo ? <AvatarImage src={photo} alt="" /> : null}
                              <AvatarFallback className="text-xs">{initials(client.name, client.email)}</AvatarFallback>
                            </Avatar>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{client.name || client.email}</span>
                              <span className="block truncate text-xs font-normal text-muted-foreground">{client.email}</span>
                            </span>
                          </Link>
                          <div>
                            <Badge variant={typeTone(client.taxpayerType)}>{taxpayerTypeLabel(client.taxpayerType)}</Badge>
                          </div>
                          <p className="truncate text-sm">{client.phone || "—"}</p>
                          <p className="truncate text-sm text-muted-foreground">{emailDomain(client.email)}</p>
                          <p className="truncate text-sm text-muted-foreground">{locationOf(client.city, client.state)}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(client.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                          <ContactRowActions id={client.id} email={client.email} />
                        </div>
                      </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
