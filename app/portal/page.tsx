import { PortalHome } from "@/components/portal/home";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const profile = await requireProfile("client");
  return <PortalHome profileId={profile.id} />;
}
