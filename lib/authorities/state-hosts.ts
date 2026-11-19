import prefixes from "@/lib/authorities/state-prefixes.json";

const allowed = prefixes as string[];

export function isStateDocument(href: string) {
  if (!href.startsWith("https://")) return false;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  return allowed.some((prefix) => href.startsWith(prefix));
}
