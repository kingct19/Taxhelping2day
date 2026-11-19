import { ProfileForm } from "@/components/profile-form";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await requireProfile("client");
  return (
    <>
      <h1 className="font-serif text-3xl">Profile</h1>
      <ProfileForm profile={profile} />
    </>
  );
}
