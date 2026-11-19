import { createHmac, timingSafeEqual } from "crypto";
import type { Role } from "@/lib/types";

export const sessionCookie = "th2d_session";

export type Session = {
  id: string;
  role: Role;
  exp: number;
};

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production.");
  }
  return value || "taxhelping2day-dev-session";
}

export function signSession(session: Session): string {
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function readSessionToken(token: string | undefined): Session | null {
  if (!token) {
    return null;
  }
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Session;
    if (!parsed.id || (parsed.role !== "client" && parsed.role !== "staff") || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
