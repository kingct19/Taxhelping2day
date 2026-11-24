import { PoaPanel } from "@/components/portal/poa-panel";
import { requireProfile } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PoaPage() {
  const profile = await requireProfile("client");
  const signatures = await getStore().listSignatures(profile.id);
  const signed = signatures.find((item) => item.kind === "poa") ?? null;

  return (
    <div className="grid gap-4">
      <header className="grid gap-1">
        <a className="text-sm underline" href="/portal/signatures">All signatures</a>
        <h1 className="font-serif text-3xl">Power of attorney</h1>
      </header>
      <PoaPanel profile={profile} signed={signed} />
    </div>
  );
}
