import { initials } from "@/lib/inbox-view";
import { cn } from "@/lib/utils";

export function PortalAvatar({
  id,
  name,
  email,
  avatarPath,
  className,
}: {
  id: string;
  name: string;
  email: string;
  avatarPath: string | null;
  className?: string;
}) {
  if (avatarPath) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/files/avatars/${id}?v=${encodeURIComponent(avatarPath)}`}
        alt=""
        className={cn("size-8 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span className={cn("flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary", className)}>
      {initials(name, email)}
    </span>
  );
}
