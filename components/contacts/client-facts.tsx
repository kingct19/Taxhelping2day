import { catalogLabel, type FilingCatalog } from "@/lib/filing-catalog";
import { shortDate } from "@/lib/return-progress";
import { filingTypesOf, type Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

function Row({ label, value }: { label: string; value: string }) {
  const text = value.trim();
  const missing = text.length === 0;
  return (
    <li className="grid gap-0.5 border-t py-2 first:border-t-0 first:pt-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={cn("text-sm", missing && "text-muted-foreground")}>{missing ? "Not on file" : text}</span>
    </li>
  );
}

export function ClientFacts({ profile, catalog }: { profile: Profile; catalog: FilingCatalog }) {
  const address = [profile.address, profile.city, profile.state, profile.zip].filter(Boolean).join(", ");
  const filingTypes = filingTypesOf(profile).map((type) => catalogLabel(catalog, type)).join(", ");
  return (
    <section className="grid content-start gap-3 rounded-lg border p-3">
      <h2 className="text-sm font-medium">About this client</h2>
      <ul className="grid">
        <Row label="Phone" value={profile.phone} />
        <Row label="Address" value={address} />
        <Row label="Filing" value={filingTypes} />
        <Row label="Spouse" value={profile.spouseName} />
        <Row label="Tax years" value={profile.taxYears} />
        <Row label="Taxpayer ID" value={profile.taxIdLast4 ? `Ending ${profile.taxIdLast4}` : ""} />
        <Row label="Client since" value={shortDate(profile.createdAt)} />
        <Row label="Portal accepted" value={profile.portalAcceptedAt ? shortDate(profile.portalAcceptedAt) : ""} />
      </ul>
    </section>
  );
}
