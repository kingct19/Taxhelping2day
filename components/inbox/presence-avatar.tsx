import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function PresenceAvatar({
  initials,
  name,
  size = "default",
  src = null,
  className,
}: {
  initials: string;
  name: string;
  size?: "default" | "sm" | "lg";
  src?: string | null;
  className?: string;
}) {
  return (
    <Avatar size={size} className={className}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback className="text-xs">{initials || name.slice(0, 1).toUpperCase() || "?"}</AvatarFallback>
    </Avatar>
  );
}
