import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "crypto";

let cachedKey: Buffer | null = null;

function encryptionKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }
  const secret = process.env.APP_ENCRYPTION_KEY;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("APP_ENCRYPTION_KEY is required in production.");
  }
  cachedKey = scryptSync(secret || "taxhelping2day-dev-key", "taxhelping2day", 32);
  return cachedKey;
}

export function encryptText(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptText(payload: string): string {
  const buffer = Buffer.from(payload, "base64");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function last4(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.slice(-4);
}
