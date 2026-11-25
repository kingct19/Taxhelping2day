export const signInMethodIds = ["email_code", "email_link", "google"] as const;

export type SignInMethod = (typeof signInMethodIds)[number];

export type SignInMethods = Record<SignInMethod, boolean>;

export function defaultSignInMethods(): SignInMethods {
  return { email_code: true, email_link: false, google: false };
}

export function parseSignInMethods(value: unknown): SignInMethods | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const methods = {} as SignInMethods;
  for (const id of signInMethodIds) {
    if (typeof row[id] !== "boolean") return null;
    methods[id] = row[id];
  }
  return methods;
}

export function signInMethodsError(methods: SignInMethods): string | null {
  if (signInMethodIds.some((id) => methods[id])) return null;
  return "Turn on at least one way to sign in.";
}

export function readableSignInMethods(value: unknown): SignInMethods {
  const parsed = parseSignInMethods(value);
  if (!parsed || signInMethodsError(parsed)) return defaultSignInMethods();
  return parsed;
}

function listPhrase(parts: string[]): string {
  if (parts.length === 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} or ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, or ${parts[parts.length - 1]}`;
}

export function signInOffer(methods: SignInMethods): string {
  const parts: string[] = [];
  if (methods.email_code) parts.push("a code emailed to this address");
  if (methods.email_link) parts.push("a link emailed to this address");
  if (methods.google) parts.push("Google with this address");
  return listPhrase(parts);
}

export function inviteDescription(audience: "client" | "staff", methods: SignInMethods): string {
  const place = audience === "client" ? "their portal" : "the desk";
  return `They get an invitation email. After that, they open ${place} with ${signInOffer(methods)}.`;
}

export function signInSubtitle(methods: SignInMethods): string {
  const email = methods.email_code && methods.email_link
    ? "a sign-in code or link"
    : methods.email_code
      ? "a sign-in code"
      : methods.email_link
        ? "a sign-in link"
        : null;
  if (!email) return "Sign in with Google.";
  if (methods.google) return `We'll email ${email} to the address on file, or you can use Google.`;
  return `We'll email ${email} to the address on file.`;
}

export function signInMethodCopy(id: SignInMethod): { label: string; hint: string } {
  switch (id) {
    case "email_code":
      return { label: "Email code", hint: "A code is sent to the address on file." };
    case "email_link":
      return { label: "Magic link", hint: "A link is sent to the address on file. No code." };
    case "google":
      return { label: "Google", hint: "They continue with Google using the address on file." };
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}
