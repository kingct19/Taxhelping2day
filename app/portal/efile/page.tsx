import { EfilePanel } from "@/components/efile-panel";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EfilePage() {
  const profile = await requireProfile("client");
  const store = getStore();
  const [returns, authorizations] = await Promise.all([store.listReturns(profile.id), store.listAuthorizations()]);

  return (
    <>
      <Link className="text-sm underline" href="/portal/signatures">All signatures</Link>
      <h1 className="font-serif text-3xl">E-file authorization</h1>
      {!returns.length && <p className="text-muted-foreground">Your preparer will ask for Form 8879 when a return is ready to file.</p>}
      {returns.map((item) => (
        <EfilePanel
          key={item.id}
          mode="client"
          profileId={profile.id}
          returnId={item.id}
          returnVersion={item.returnVersion}
          authorizations={authorizations}
        />
      ))}
    </>
  );
}
