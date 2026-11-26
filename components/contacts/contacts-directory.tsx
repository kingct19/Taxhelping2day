"use client";

import { useMemo } from "react";
import Link from "next/link";
import { SearchIcon, XIcon } from "lucide-react";
import { ContactRowActions } from "@/components/contacts/contact-row-actions";
import { NewContactDialog } from "@/components/contacts/new-contact-dialog";
import { LiniqoEmpty, liniqo } from "@/components/liniqo-empty";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSavedState } from "@/hooks/use-saved-state";
import { isTaxpayerType, taxpayerTypeLabel, type TaxpayerType } from "@/lib/types";

export type ContactRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  spouseName: string;
  taxpayerType: TaxpayerType;
  filingTypes: string[];
  photo: string | null;
  added: string;
};

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
  return email.split("@")[1] ?? "";
}

function locationOf(city: string, state: string) {
  const place = [city, state].filter(Boolean).join(", ");
  return place || "—";
}


function labelOf(type: string, labels: Record<string, string>) {
  if (labels[type]) return labels[type];
  if (isTaxpayerType(type)) return taxpayerTypeLabel(type);
  return type;
}

function toneOf(type: string) {
  if (!isTaxpayerType(type)) return "neutral" as const;
  return typeTone(type);
}

function haystack(client: ContactRow, labels: Record<string, string>) {
  return [client.name, client.email, client.phone, client.city, client.state, emailDomain(client.email), client.spouseName, ...client.filingTypes.map((type) => labelOf(type, labels))]
    .join(" ")
    .toLowerCase();
}

type ContactFilterState = { query: string; state: string; domain: string };

function isContactFilterState(value: unknown): value is ContactFilterState {
  if (!value || typeof value !== "object") return false;
  const item = value as ContactFilterState;
  return typeof item.query === "string" && typeof item.state === "string" && typeof item.domain === "string";
}

export function ContactsDirectory({ title, clients, typeLabels = {}, inviteDescription }: { title: string; clients: ContactRow[]; typeLabels?: Record<string, string>; inviteDescription: string }) {
  const [saved, setSaved] = useSavedState("view:contacts-directory", { query: "", state: "any", domain: "any" }, isContactFilterState);
  const { query, state, domain } = saved;
  const setQuery = (next: string) => setSaved((current) => ({ ...current, query: next }));
  const setState = (next: string) => setSaved((current) => ({ ...current, state: next }));
  const setDomain = (next: string) => setSaved((current) => ({ ...current, domain: next }));
  const filtering = query.trim().length > 0 || state !== "any" || domain !== "any";
  const places = useMemo(() => {
    const seen = new Map<string, string>();
    let missing = false;
    for (const client of clients) {
      const value = client.state.trim();
      if (!value && !client.city.trim()) missing = true;
      if (!value) continue;
      const key = value.toLowerCase();
      if (!seen.has(key)) seen.set(key, value);
    }
    return {
      options: [...seen.entries()].sort((left, right) => left[1].localeCompare(right[1])),
      missing,
    };
  }, [clients]);
  const domains = useMemo(() => {
    const seen = new Map<string, string>();
    for (const client of clients) {
      const value = emailDomain(client.email);
      if (!value) continue;
      const key = value.toLowerCase();
      if (!seen.has(key)) seen.set(key, value);
    }
    return [...seen.entries()].sort((left, right) => left[1].localeCompare(right[1]));
  }, [clients]);
  const visible = useMemo(
    () =>
      clients.filter((client) => {
        const needle = query.trim().toLowerCase();
        if (needle && !haystack(client, typeLabels).includes(needle)) return false;
        if (state === "none" && (client.city.trim() || client.state.trim())) return false;
        if (state !== "any" && state !== "none" && client.state.trim().toLowerCase() !== state) return false;
        if (domain !== "any" && emailDomain(client.email).toLowerCase() !== domain) return false;
        return true;
      }),
    [clients, domain, query, state, typeLabels],
  );
  const showLocation = places.options.length + (places.missing ? 1 : 0) > 1;
  const showDomain = domains.length > 1;
  const locationOptions = [
    { label: "Any location", value: "any" },
    ...places.options.map(([value, label]) => ({ label, value })),
    ...(places.missing ? [{ label: "No location", value: "none" }] : []),
  ];
  const domainOptions = [{ label: "Any domain", value: "any" }, ...domains.map(([value, label]) => ({ label, value }))];

  function clear() {
    setQuery("");
    setState("any");
    setDomain("any");
  }

  const countLabel = filtering
    ? `Showing ${visible.length} of ${clients.length}`
    : `${clients.length} ${clients.length === 1 ? "person" : "people"}`;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground" aria-live="polite">{countLabel}</p>
        </div>
        <div className="ml-auto">
          <NewContactDialog description={inviteDescription} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex flex-col gap-3 p-4">
      {clients.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="h-8 w-full bg-transparent sm:w-64">
            <InputGroupAddon>
              <SearchIcon className="size-4" />
            </InputGroupAddon>
            <InputGroupInput aria-label="Search contacts" placeholder="Name, email, or phone" value={query} onChange={(event) => setQuery(event.target.value)} />
            {query ? (
              <button type="button" aria-label="Clear search" className="text-muted-foreground hover:text-foreground" onClick={() => setQuery("")}>
                <XIcon className="size-3.5" />
              </button>
            ) : null}
          </InputGroup>
          {showLocation ? <FilterSelect label="Location" value={state} options={locationOptions} onChange={setState} /> : null}
          {showDomain ? <FilterSelect label="Domain" value={domain} options={domainOptions} onChange={setDomain} /> : null}
          {filtering ? (
            <Button type="button" variant="ghost" size="sm" onClick={clear}>
              Clear
            </Button>
          ) : null}
        </div>
      ) : null}
      <Card>
        <CardContent>
          {clients.length === 0 ? (
            <LiniqoEmpty {...liniqo.segment}>No contacts in this segment.</LiniqoEmpty>
          ) : visible.length === 0 ? (
            <LiniqoEmpty {...liniqo.noMatch}>No contacts match.</LiniqoEmpty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="border-b px-3 pb-2 font-normal">Name</th>
                    <th className="border-b px-3 pb-2 font-normal">Type</th>
                    <th className="border-b px-3 pb-2 font-normal">Phone</th>
                    <th className="border-b px-3 pb-2 font-normal">Email</th>
                    <th className="border-b px-3 pb-2 font-normal">Location</th>
                    <th className="border-b px-3 pb-2 font-normal">Added</th>
                    <th className="border-b px-3 pb-2 font-normal"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="[&>tr:last-child>td]:border-b-0">
                  {visible.map((client) => (
                    <tr key={client.id}>
                      <td className="border-b px-3 py-3 whitespace-nowrap">
                        <Link href={`/contacts/${client.id}`} className="flex items-center gap-3">
                          <Avatar className="size-9 shrink-0">
                            {client.photo ? <AvatarImage src={client.photo} alt="" /> : null}
                            <AvatarFallback className="text-xs">{initials(client.name, client.email)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{client.name || client.email}</span>
                        </Link>
                      </td>
                      <td className="border-b px-3 py-3 whitespace-nowrap">
                        <span className="flex flex-wrap gap-1">
                          {client.filingTypes.map((type) => (
                            <Badge key={type} variant={toneOf(type)}>{labelOf(type, typeLabels)}</Badge>
                          ))}
                        </span>
                      </td>
                      <td className="border-b px-3 py-3 whitespace-nowrap">{client.phone || "—"}</td>
                      <td className="border-b px-3 py-3 whitespace-nowrap text-muted-foreground">{client.email || "—"}</td>
                      <td className="border-b px-3 py-3 whitespace-nowrap text-muted-foreground">{locationOf(client.city, client.state)}</td>
                      <td className="border-b px-3 py-3 whitespace-nowrap text-muted-foreground">{client.added}</td>
                      <td className="border-b px-3 py-3 whitespace-nowrap">
                        <ContactRowActions id={client.id} email={client.email} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Select items={options} value={value} onValueChange={(next) => { if (next) onChange(next); }}>
      <SelectTrigger size="sm" aria-label={label} className="h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
