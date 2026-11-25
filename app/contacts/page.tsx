import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { ContactsDirectory, type ContactRow } from "@/components/contacts/contacts-directory";
import { buttonVariants } from "@/components/ui/button-variants";
import { inviteDescription } from "@/lib/sign-in-methods";
import { getStore } from "@/lib/store";
import { avatarUrl } from "@/lib/avatar";
import { filingTypesOf, taxpayerTypeLabel, taxpayerTypes, type TaxpayerType } from "@/lib/types";
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

const segments: Segment[] = ["all", ...taxpayerTypes];

function addedOn(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ segment?: string }> }) {
  await requireProfile("staff");
  const { segment: segmentQuery } = await searchParams;
  const segment = segmentQuery && isSegment(segmentQuery) ? segmentQuery : "all";
  const store = getStore();
  const [profiles, catalog, methods] = await Promise.all([store.listProfiles(), store.getFilingCatalog(), store.getSignInMethods()]);
  const rows = profiles.filter((profile) => profile.role === "client");
  const visible = rows.filter((client) => {
    switch (segment) {
      case "all":
        return true;
      case "individual":
      case "business":
      case "nonprofit":
        return filingTypesOf(client).includes(segment);
      default: {
        const exhaustive: never = segment;
        return exhaustive;
      }
    }
  });
  const listed: ContactRow[] = visible.map((client) => ({
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    city: client.city,
    state: client.state,
    spouseName: client.spouseName,
    taxpayerType: client.taxpayerType,
    filingTypes: filingTypesOf(client),
    photo: avatarUrl(client.id, client.avatarPath),
    added: addedOn(client.createdAt),
  }));

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
                  return filingTypesOf(client).includes(item);
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
      <ContactsDirectory title={segmentLabel(segment)} clients={listed} typeLabels={Object.fromEntries(catalog.types.map((type) => [type.id, type.label]))} inviteDescription={inviteDescription("client", methods)} />
    </div>
  );
}
