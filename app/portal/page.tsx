import { PortalSeason } from "@/components/portal-season";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const profile = await requireProfile("client");
  return <PortalSeason profileId={profile.id} />;
}
