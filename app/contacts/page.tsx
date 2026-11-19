import Link from "next/link";
import { importClients, submitClientInvite } from "@/lib/actions";
import { requireProfile } from "@/lib/auth";
import { NewContactDialog } from "@/components/contacts/new-contact-dialog";
import { ContactRowActions } from "@/components/contacts/contact-row-actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getStore } from "@/lib/store";
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
                <TableHead>Type</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email domain</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No contacts in this segment.
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Link href={`/contacts/${client.id}`} className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="text-xs">{initials(client.name, client.email)}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{client.name || client.email}</span>
                          <span className="block truncate text-xs font-normal text-muted-foreground">{client.email}</span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={typeTone(client.taxpayerType)}>{taxpayerTypeLabel(client.taxpayerType)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{client.phone || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{emailDomain(client.email)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{locationOf(client.city, client.state)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(client.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    <TableCell>
                      <ContactRowActions id={client.id} email={client.email} />
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
