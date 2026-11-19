import { SettingsField, SettingsSection } from "@/components/settings/settings-section";
import { SettingsFrame } from "@/components/settings/settings-frame";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const profile = await requireProfile("staff");

  return (
    <SettingsFrame title="Profile" description="How you appear on the desk.">
      <SettingsSection title="Your details" description="The name and email on the staff account you are signed in with.">
        <SettingsField id="profile-name" label="Name" value={profile.name || "Staff"} />
        <SettingsField id="profile-email" label="Email" value={profile.email} />
        <SettingsField id="profile-role" label="Role" value="Staff" />
      </SettingsSection>
      <SettingsSection title="Sign-in" description="How this account gets back into the desk.">
        <SettingsField id="profile-method" label="Method" value="Email code" hint="There is no password on this account." />
      </SettingsSection>
    </SettingsFrame>
  );
}
