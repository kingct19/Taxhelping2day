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

export type PacketSigner = { email: string; status: string };
export type PacketFile = { name: string };

export function packetSigners(value: unknown): PacketSigner[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const email = "email" in item && typeof item.email === "string" ? item.email : "";
    const status = "status" in item && typeof item.status === "string" ? item.status : "";
    if (!email) return [];
    return [{ email, status }];
  });
}

export function packetFiles(value: unknown): PacketFile[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || !("name" in item) || typeof item.name !== "string") return [];
    return [{ name: item.name }];
  });
}
