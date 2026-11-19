import Link from "next/link";
import { importClients, submitClientInvite } from "@/lib/actions";
import { requireProfile } from "@/lib/auth";
import { NewContactDialog } from "@/components/contacts/new-contact-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { isSeasonStage, seasonFor, seasonLabel, seasonStages, type SeasonStage } from "@/lib/season";
import { getStore } from "@/lib/store";
import { taxpayerTypeLabel, taxpayerTypes, type TaxpayerType } from "@/lib/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Segment = "all" | SeasonStage | TaxpayerType;

function isSegment(value: string): value is Segment {
  return value === "all" || isSeasonStage(value) || taxpayerTypes.some((type) => type === value);
}

function segmentLabel(segment: Segment) {
  switch (segment) {
    case "all":
      return "All contacts";
    case "profile":
    case "letter":
    case "documents":
    case "ready":
      return seasonLabel(segment);
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

const segments: Segment[] = ["all", ...seasonStages, ...taxpayerTypes];

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ segment?: string }> }) {
  await requireProfile("staff");
  const { segment: segmentQuery } = await searchParams;
  const segment = segmentQuery && isSegment(segmentQuery) ? segmentQuery : "all";
  const store = getStore();
  const profiles = await store.listProfiles();
  const clients = profiles.filter((profile) => profile.role === "client");
  const rows = await Promise.all(
    clients.map(async (client) => {
      const [documents, signatures] = await Promise.all([store.listDocuments(client.id), store.listSignatures(client.id)]);
      return {
        client,
        stage: seasonFor(client, signatures, documents),
        poa: signatures.some((item) => item.kind === "poa"),
      };
    }),
  );
  const visible = rows.filter((row) => {
    switch (segment) {
      case "all":
        return true;
      case "profile":
      case "letter":
      case "documents":
      case "ready":
        return row.stage === segment;
      case "individual":
      case "business":
      case "nonprofit":
        return row.client.taxpayerType === segment;
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
            const count = rows.filter((row) => {
              switch (item) {
                case "all":
                  return true;
                case "profile":
                case "letter":
                case "documents":
                case "ready":
                  return row.stage === item;
                case "individual":
                case "business":
                case "nonprofit":
                  return row.client.taxpayerType === item;
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
            <NewContactDialog>
              <form action={submitClientInvite} className="flex flex-col gap-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <Input id="name" name="name" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input id="email" name="email" type="email" required />
                  </Field>
                </FieldGroup>
                <Button type="submit">Send invite</Button>
              </form>
              <form action={importClients} className="mt-6 flex flex-col gap-4 border-t pt-6">
                <Field>
                  <FieldLabel htmlFor="csv">Import email, name</FieldLabel>
                  <Textarea id="csv" name="csv" rows={4} placeholder={"ada@example.com, Ada Lovelace"} />
                </Field>
                <Button type="submit" variant="outline">
                  Import
                </Button>
              </form>
            </NewContactDialog>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Where they are</TableHead>
                <TableHead>Form 2848</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    No contacts in this segment.
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((row) => (
                  <TableRow key={row.client.id}>
                    <TableCell>
                      <Link href={`/contacts/${row.client.id}`} className="flex items-center gap-3 font-medium">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">
                            {(row.client.name || row.client.email)
                              .split(/[\s@]+/)
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0]?.toUpperCase() ?? "")
                              .join("") || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0">
                          <span className="block truncate">{row.client.name || row.client.email}</span>
                          <span className="block truncate text-xs font-normal text-muted-foreground">{row.client.email}</span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>{seasonLabel(row.stage)}</TableCell>
                    <TableCell>
                      <Badge variant={row.poa ? "success" : "warning"}>{row.poa ? "Signed" : "Open"}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
