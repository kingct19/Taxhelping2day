import { DeskShell } from "@/components/desk-shell";
import { requireProfile } from "@/lib/auth";
import { avatarUrl } from "@/lib/avatar";

export async function DeskFrame({
  side,
  unread = 0,
  children,
}: {
  side: "staff" | "client";
  unread?: number;
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  return (
    <DeskShell side={side} unread={unread} avatarUrl={avatarUrl(profile.id, profile.avatarPath)}>
      {children}
    </DeskShell>
  );
}
