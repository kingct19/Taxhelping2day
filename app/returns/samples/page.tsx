import { PortalHome } from "@/components/portal/home";
import Link from "next/link";
import { SubpageNav } from "@/components/subpage-nav";
import { requireProfile } from "@/lib/auth";
import { staffNext } from "@/lib/next-action";
import { requestThreads } from "@/lib/request-thread";
import { getStore } from "@/lib/store";
import type { Message } from "@/lib/types";

export const dynamic = "force-dynamic";

const sampleDomain = "preview.taxhelping2day.test";

export default async function SampleClientsPage() {
  await requireProfile("staff");
  const store = getStore();
  const [profiles, returns, requestRows, filings, authorizations] = await Promise.all([
    store.listProfiles(),
    store.listTeamReturns(),
    store.listRequestStates(),
    store.listFilings(),
    store.listAuthorizations(),
  ]);
  const samples = profiles.filter((profile) => profile.email.endsWith(`@${sampleDomain}`));
  const messages = requestRows.filter((row) => row.requestState);

  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="mb-6 grid gap-3">
        <SubpageNav
          backHref="/returns"
          backLabel="Back to returns"
          crumbs={[{ href: "/returns", label: "Returns" }, { label: "Sample clients" }]}
        />
        <div>
          <h1 className="text-2xl font-semibold">Sample clients</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Each pair is the same return: what the client sees, and the work sitting on the firm.</p>
        </div>
      </div>
      {samples.length === 0 && <p>No sample clients yet.</p>}
      <div className="grid gap-8">
        {samples.map((profile) => {
          const item = returns.find((row) => row.profileId === profile.id);
          const threads = requestThreads(messages.filter((row) => row.returnId === item?.id) as Message[]);
          const next = item ? staffNext({
            name: profile.name || profile.email,
            due: item.due,
            stage: item.stage,
            threads,
            filings: filings.filter((row) => row.returnId === item.id),
            authorizations: authorizations.filter((row) => row.returnId === item.id),
            returnVersion: item.returnVersion,
          }) : null;
          return (
            <section key={profile.id} className="grid gap-4 border-t pt-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Client portal</p>
                <div className="grid gap-4 rounded-lg bg-muted/40 p-4">
                  <PortalHome profileId={profile.id} readOnly />
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Firm desk</p>
                <div className="rounded-lg border p-4">
                  <h2 className="text-xl font-semibold">{next?.headline ?? profile.name}</h2>
                  {next?.detail && <p className="mt-2 text-sm">{next.detail}</p>}
                  {item && <Link className="mt-4 inline-block text-sm underline" href={`/returns/${profile.id}/${item.id}`}>Open this return</Link>}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
