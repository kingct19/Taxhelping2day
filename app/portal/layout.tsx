import { DeskFrame } from "@/components/desk-frame";
import { PortalCanvas } from "@/components/portal/portal-canvas";
import { requireProfile } from "@/lib/auth";
import { unreadFromStaff } from "@/lib/client-home";
import { getStore } from "@/lib/store";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile("client");
  const messages = await getStore().listMessages(profile.id);
  return (
    <DeskFrame side="client" unread={unreadFromStaff(messages)}>
      <PortalCanvas>{children}</PortalCanvas>
    </DeskFrame>
  );
}
