export type PrefillProfile = {
  name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

function matchField(fieldName: string, profile: PrefillProfile): string | null {
  const key = fieldName.trim().toLowerCase().replace(/\s+/g, " ");
  switch (key) {
    case "email":
      return profile.email || null;
    case "address":
      return profile.address || null;
    case "city":
      return profile.city || null;
    case "state":
      return profile.state || null;
    case "zip":
    case "zip code":
      return profile.zip || null;
    case "city, state and zip":
    case "city, state, zip":
    case "city state zip":
    case "city state and zip": {
      const line = [profile.city, profile.state, profile.zip].filter(Boolean).join(", ");
      return line || null;
    }
    case "name":
    case "full name":
    case "taxpayer name":
    case "first & last name":
    case "first and last name":
      return profile.name || null;
    case "first name":
      return profile.name.trim().split(/\s+/)[0] || null;
    case "last name":
      return profile.name.trim().split(/\s+/).slice(1).join(" ") || null;
    default:
      return null;
  }
}

export function prefillValues(fieldNames: string[], profile: PrefillProfile): Record<string, string> {
  const values: Record<string, string> = {};
  for (const fieldName of fieldNames) {
    const value = matchField(fieldName, profile);
    if (value) values[fieldName] = value;
  }
  return values;
}

export type PacketSigner = {
  email: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  completedAt: string | null;
};
export type PacketFile = { name: string };

function stamp(item: object, camel: string, snake: string): string | null {
  const record = item as Record<string, unknown>;
  const value = record[camel] ?? record[snake];
  return typeof value === "string" && value ? value : null;
}

export function packetSigners(value: unknown): PacketSigner[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const email = "email" in item && typeof item.email === "string" ? item.email : "";
    const status = "status" in item && typeof item.status === "string" ? item.status : "";
    const sentAt = stamp(item, "sentAt", "sent_at");
    const openedAt = stamp(item, "openedAt", "opened_at");
    const completedAt = stamp(item, "completedAt", "completed_at");
    if (!email && !status) return [];
    return [{ email, status, sentAt, openedAt, completedAt }];
  });
}

export function packetFiles(value: unknown): PacketFile[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || !("name" in item) || typeof item.name !== "string") return [];
    return [{ name: item.name }];
  });
}
