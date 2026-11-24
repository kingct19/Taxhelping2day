const maxAvatarBytes = 2_500_000;

export function avatarContentType(bytes: Buffer, declared: string): "image/jpeg" | "image/png" | "image/webp" | null {
  const type = declared === "image/jpg" ? "image/jpeg" : declared;
  if (bytes.length < 12 || bytes.length > maxAvatarBytes) return null;
  if (type === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (type === "image/png" && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (type === "image/webp" && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export function avatarExtension(contentType: "image/jpeg" | "image/png" | "image/webp"): "jpg" | "png" | "webp" {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default: {
      const exhaustive: never = contentType;
      return exhaustive;
    }
  }
}

export function avatarStorageKey(profileId: string, extension: "jpg" | "png" | "webp"): string {
  if (!/^[\w-]+$/.test(profileId)) throw new Error("Profile not found.");
  return `avatars/${profileId}.${extension}`;
}

export function safeAvatarPath(value: string | null | undefined): string | null {
  if (!value || !/^avatars\/[\w-]+\.(jpg|png|webp)$/.test(value)) return null;
  return value;
}

export function avatarUrl(profileId: string, avatarPath: string | null | undefined): string | null {
  const path = safeAvatarPath(avatarPath);
  if (!path || !/^[\w-]+$/.test(profileId)) return null;
  return `/files/avatars/${profileId}?v=${encodeURIComponent(path)}`;
}

export function avatarMime(storagePath: string): string {
  if (storagePath.endsWith(".png")) return "image/png";
  if (storagePath.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}
