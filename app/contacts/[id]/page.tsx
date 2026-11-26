import { ClientFiles } from "@/components/contacts/client-files";
import { ClientHeader } from "@/components/contacts/client-header";
import { ClientOverview } from "@/components/contacts/client-overview";
import { ClientReturns } from "@/components/contacts/client-returns";
import { ClientSignatures } from "@/components/contacts/client-signatures";
import { ClientSummary } from "@/components/contacts/client-summary";
import { ClientTabs } from "@/components/contacts/client-tabs";
import { SubpageNav } from "@/components/subpage-nav";
import { requireProfile } from "@/lib/auth";
import { avatarUrl } from "@/lib/avatar";
import { isClientTab, partitionReturns, type ClientTab } from "@/lib/client-file";
import { catalogLabel, type FilingCatalog } from "@/lib/filing-catalog";
import { shortDate } from "@/lib/return-progress";
import { stages, type TeamReturn } from "@/lib/return-workflow";
import { getStore } from "@/lib/store";
import { filingTypesOf, type DocumentRecord, type EfileAuthorization, type FilingRecord, type IdentityNote, type Profile, type SignatureRecord } from "@/lib/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function chosenTab(value: string | undefined): ClientTab {
  return isClientTab(value) ? value : "overview";
}

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireProfile("staff");
  const { id } = await params;
  const query = await searchParams;
  const store = getStore();
  const client = await store.getProfile(id);
  if (!client || client.role !== "client") {
    notFound();
  }
  const [documents, signatures, identity, catalog, team, filings, authorizations] = await Promise.all([
    store.listDocuments(client.id),
    store.listSignatures(client.id),
    store.getIdentity(client.id),
    store.getFilingCatalog(),
    store.listTeamReturns(),
    store.listFilings(),
    store.listAuthorizations(),
  ]);
  const returns = team.filter((item) => item.profileId === client.id);
  const returnIds = new Set(returns.map((item) => item.id));
  const clientFilings = filings.filter((item) => returnIds.has(item.returnId));
  const clientAuthorizations = authorizations.filter((item) => returnIds.has(item.returnId));
  const labels = Object.fromEntries(catalog.types.map((type) => [type.id, type.label]));
  const tab = chosenTab(query.tab);
  const { open, filed } = partitionReturns(returns);
  const signedCount = signatures.length + clientAuthorizations.filter((item) => item.status === "signed").length;
  const filing = filingTypesOf(client).map((type) => catalogLabel(catalog, type)).join(", ") || "Taxpayer";
  const name = client.name || client.email;

  return (
    <main className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 content-start gap-4 overflow-auto px-4 py-4 md:px-6">
      <SubpageNav
        backHref="/contacts"
        backLabel="Back to contacts"
        crumbs={[{ href: "/contacts", label: "Contacts" }, { label: name }]}
      />
      <ClientHeader
        name={name}
        email={client.email}
        avatar={avatarUrl(client.id, client.avatarPath)}
        filing={filing}
        phone={client.phone}
        since={shortDate(client.createdAt)}
        portal={client.portalAcceptedAt ? shortDate(client.portalAcceptedAt) : ""}
        stage={open[0]?.stage ?? null}
        deskHref={`/tasks?client=${client.id}`}
        conversationHref={`/inbox?id=${client.id}`}
      />
      <ClientSummary
        profileId={client.id}
        tab={tab}
        cards={[
          {
            tab: "returns",
            label: "Open returns",
            detail: open.length === 0 ? "None open" : open.length === 1 ? stages[open[0].stage] : `${open.length} in progress`,
            count: open.length,
          },
          {
            tab: "returns",
            label: "Filed years",
            detail: filed.length === 0 ? "None filed" : `${filed.length} filed`,
            count: filed.length,
          },
          {
            tab: "files",
            label: "Files",
            detail: documents.length === 0 ? "None uploaded" : `${documents.length} on file`,
            count: documents.length,
          },
          {
            tab: "signed",
            label: "Signed",
            detail: signedCount === 0 ? "Nothing signed" : `${signedCount} signed`,
            count: signedCount,
          },
        ]}
      />
      <ClientTabs tab={tab} profileId={client.id} />
      <ClientPanel
        tab={tab}
        client={client}
        catalog={catalog}
        labels={labels}
        returns={returns}
        documents={documents}
        signatures={signatures}
        identity={identity}
        filings={clientFilings}
        authorizations={clientAuthorizations}
      />
    </main>
  );
}

function ClientPanel({
  tab,
  client,
  catalog,
  labels,
  returns,
  documents,
  signatures,
  identity,
  filings,
  authorizations,
}: {
  tab: ClientTab;
  client: Profile;
  catalog: FilingCatalog;
  labels: Record<string, string>;
  returns: TeamReturn[];
  documents: DocumentRecord[];
  signatures: SignatureRecord[];
  identity: IdentityNote | null;
  filings: FilingRecord[];
  authorizations: EfileAuthorization[];
}) {
  switch (tab) {
    case "overview":
      return (
        <ClientOverview
          profile={client}
          catalog={catalog}
          labels={labels}
          returns={returns}
          documents={documents}
          signatures={signatures}
          identity={identity}
        />
      );
    case "returns":
      return (
        <ClientReturns
          profileId={client.id}
          taxpayerType={client.taxpayerType}
          returns={returns}
          filings={filings}
          labels={labels}
        />
      );
    case "files":
      return <ClientFiles documents={documents} />;
    case "signed":
      return (
        <ClientSignatures
          profileId={client.id}
          signatures={signatures}
          identity={identity}
          returns={returns}
          authorizations={authorizations}
        />
      );
    default: {
      const exhaustive: never = tab;
      return exhaustive;
    }
  }
}
