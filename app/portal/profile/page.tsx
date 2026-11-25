import { AvatarEditor } from "@/components/portal/avatar-editor";
import { ProfileForm } from "@/components/profile-form";
import { requireProfile } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await requireProfile("client");
  const catalog = await getStore().getFilingCatalog();
  const selected = profile.filingTypes ?? [profile.taxpayerType];
  const options = catalog.types
    .filter((type) => !type.retired || selected.includes(type.id))
    .map((type) => ({ id: type.id, label: type.label, form: type.form }));
  const src = profile.avatarPath ? `/files/avatars/${profile.id}?v=${encodeURIComponent(profile.avatarPath)}` : null;
  return (
    <div className="grid gap-5">
      <header className="grid gap-1">
        <h1 className="font-serif text-3xl">Profile</h1>
        <p className="text-sm text-muted-foreground">These details fill the forms we prepare. Taxpayer ID is stored encrypted and only the last four digits are shown.</p>
      </header>
      <section className="rounded-xl bg-card px-4 py-4 ring-1 ring-foreground/10">
        <h2 className="mb-3 text-sm font-medium">Photo</h2>
        <AvatarEditor name={profile.name || profile.email} src={src} />
      </section>
      <ProfileForm profile={profile} options={options} />
    </div>
  );
}
