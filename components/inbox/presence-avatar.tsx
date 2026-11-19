import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function PresenceAvatar({ initials, name, size = "default" }: { initials: string; name: string; size?: "default" | "lg" }) {
  return (
    <Avatar size={size}>
      <AvatarFallback className="text-xs">{initials || name.slice(0, 1).toUpperCase() || "?"}</AvatarFallback>
    </Avatar>
  );
}
