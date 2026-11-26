export const viewCookie = {
  returns: "view-returns",
  contacts: "view-contacts",
  portalReturn: "view-portal-return",
  smartdocs: "view-smartdocs",
} as const;

export function decodeView(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}
