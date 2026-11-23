import "server-only";
import { createHmac } from "node:crypto";
import { packetDb } from "@/lib/docuseal";

export function builderConfigured() {
  return Boolean(process.env.DOCUSEAL_API_KEY && process.env.DOCUSEAL_USER_EMAIL && process.env.DOCUSEAL_WEBHOOK_SECRET && packetDb());
}

export function signBuilderToken(payload: Record<string, unknown>) {
  const secret = process.env.DOCUSEAL_API_KEY;
  const user = process.env.DOCUSEAL_USER_EMAIL;
  if (!secret || !user) throw new Error("Configure DocuSeal before opening the builder.");
  const issued = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, user_email: user, iat: issued, exp: issued + 60 * 60 })).toString("base64url");
  const signature = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export type RemoteTemplate = {
  id: number;
  name?: string;
  external_id?: string | null;
  submitters?: { name?: string }[];
  fields?: { name?: string }[];
  documents?: { fields?: { name?: string }[] }[];
};

export function templateFieldNames(template: RemoteTemplate): string[] {
  const names = [
    ...(template.fields ?? []).map((field) => field.name),
    ...(template.documents ?? []).flatMap((document) => (document.fields ?? []).map((field) => field.name)),
  ];
  return names.filter((name): name is string => Boolean(name));
}

export function templateRole(template: RemoteTemplate, fallback: string) {
  const name = template.submitters?.find((person) => person.name?.trim())?.name?.trim();
  return name || fallback || "First Party";
}
