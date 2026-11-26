import { ActivityTab } from "@/components/return-workspace/activity-tab";
import { DocumentsTab } from "@/components/return-workspace/documents-tab";
import { FilingTab } from "@/components/return-workspace/filing-tab";
import { OverviewTab } from "@/components/return-workspace/overview-tab";
import { PreparationTab } from "@/components/return-workspace/preparation-tab";
import { ReturnBanner } from "@/components/return-workspace/return-banner";
import { ReturnHeader } from "@/components/return-workspace/return-header";
import { ReturnTags } from "@/components/return-workspace/return-tags";
import { ReturnPanelFade } from "@/components/return-workspace/panel-fade";
import { ReturnProgress } from "@/components/return-workspace/return-progress";
import { ReturnTabs } from "@/components/return-workspace/return-tabs";
import { ReviewTab } from "@/components/return-workspace/review-tab";
import { SubpageNav } from "@/components/subpage-nav";
import { advanceEngagement, openNextYear, saveReturnWorkflow, sendBackEngagement } from "@/lib/actions";
import { requireProfile } from "@/lib/auth";
import { avatarUrl } from "@/lib/avatar";
import { refreshOpenPackets } from "@/lib/docuseal";
import { engagementLetter } from "@/lib/engagement-letter";
import { missingOrganizer, type GateInput } from "@/lib/engagement";
import { requestThreads } from "@/lib/request-thread";
import { documentEntries } from "@/lib/return-documents";
import { advanceOffer, blockerLines, isReturnTab, sendBackOffer, type ReturnTab } from "@/lib/return-progress";
import { getReturnWorkflowState } from "@/lib/return-readiness";
import { taxpayerTypeLabel } from "@/lib/types";
import { shownStage } from "@/lib/return-workflow";
import { getStore } from "@/lib/store";
import { isActiveStaff } from "@/lib/teammates";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ profileId: string; returnId: string }>;
  searchParams: Promise<{ conflict?: string; tab?: string; file?: string }>;
}) {
  await requireProfile("staff");
  const { profileId, returnId } = await params;
  const query = await searchParams;
  await refreshOpenPackets([returnId]);
  const store = getStore();
  const [team, documents, signatures, messages, profiles, filings, authorizations, invoices, catalog, firmTags, returnTags] = await Promise.all([
    store.listTeamReturns(),
    store.listDocuments(profileId),
    store.listSignatures(profileId),
    store.listMessages(profileId),
    store.listProfiles(),
    store.listFilings(returnId),
    store.listAuthorizations(returnId),
    store.listInvoices(returnId),
    store.getFilingCatalog(),
    store.listTags(),
    store.listReturnTags(),
  ]);
  const item = team.find((row) => row.id === returnId && row.profileId === profileId);
  const client = profiles.find((person) => person.id === profileId);
  if (!item || !client) notFound();

  const authors = new Map(profiles.map((person) => [person.id, person.name || person.email]));
  const teammates = profiles.filter((person) => isActiveStaff(person)).map((person) => ({ id: person.id, name: authors.get(person.id) || person.email }));
  const returnMessages = messages.filter((message) => message.returnId === returnId);
  const threads = requestThreads(returnMessages);
  const invoice = invoices[0] ?? null;
  const stage = shownStage(item);
  const letter = await engagementLetter([returnId]);
  const gate: GateInput = {
    workflow: stage === item.stage ? item : { ...item, stage },
    profile: client,
    signatures,
    threads,
    authorizations,
    invoice,
    filings,
    note: "",
    catalog,
    letter: letter.status,
  };
  const tab: ReturnTab = isReturnTab(query.tab) ? query.tab : "overview";
  const offer = advanceOffer(gate);
  const back = sendBackOffer(gate);
  const workflowState = getReturnWorkflowState(gate);
  const advanceAction = advanceEngagement.bind(null, item.id, item.revision);
  const sendBackAction = sendBackEngagement.bind(null, item.id, item.revision);
  const openYearAction = item.stage === "renewal" ? openNextYear.bind(null, profileId, returnId) : null;
  const entries = documentEntries({
    returnId,
    stage: item.stage,
    taxpayerType: item.taxpayerType,
    documents,
    signatures,
    threads,
    messages,
    authors,
    canRemind: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    desk: item.desk,
  });
  const clientName = client.name || client.email || "Unnamed customer";
  const yearLabel = `${item.taxYear} ${taxpayerTypeLabel(item.taxpayerType).toLowerCase()} return`;

  return (
    <main className="mx-auto grid w-full max-w-6xl content-start gap-4 overflow-auto px-4 py-4 md:px-6">
      <SubpageNav
        backHref="/returns"
        backLabel="Back to returns"
        crumbs={[{ href: "/returns", label: "Returns" }, { label: `${item.taxYear} ${taxpayerTypeLabel(item.taxpayerType)}` }]}
      />
      {query.conflict ? (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          This return changed before you saved. Refresh and apply the change again.
        </p>
      ) : null}
      <ReturnHeader
        clientName={clientName}
        avatar={avatarUrl(client.id, client.avatarPath)}
        yearLabel={yearLabel}
        email={client.email}
        preparer={authors.get(item.owner ?? "") || "Unassigned"}
        reviewer={authors.get(item.reviewerId ?? "") || "Unassigned"}
        due={item.due}
        stage={stage}
        waitingOn={stage === "canceled" ? null : item.waitingOn}
        assignAction={saveReturnWorkflow.bind(null, item.id, item.revision)}
        advanceAction={offer ? advanceAction : null}
        advanceLabel={offer?.label ?? null}
        advanceNeedsNote={offer?.needsNote ?? false}
        sendBackAction={back ? sendBackAction : null}
        sendBackLabel={back?.label ?? null}
        openYearAction={openYearAction}
        contactHref={`/contacts/${profileId}`}
        teammates={teammates}
        ownerId={item.owner ?? ""}
        nextAction={stage === "canceled" ? "Client cancelled this return." : item.nextAction}
        readiness={workflowState.overall}
        profileId={profileId}
        returnId={returnId}
        revision={item.revision}
        source={item.source}
        services={item.services}
        invoice={invoice}
      />
      <ReturnTags
        returnId={returnId}
        catalog={firmTags}
        applied={firmTags.filter((tag) => returnTags.some((row) => row.returnId === returnId && row.tagId === tag.id))}
      />
      <ReturnBanner
        stage={stage}
        blocker={blockerLines(gate)[0] ?? null}
        advanceAction={offer ? advanceAction : null}
        advanceLabel={offer?.label ?? null}
        advanceNeedsNote={offer?.needsNote ?? false}
        openYearAction={openYearAction}
      />
      <ReturnProgress steps={workflowState.stages} operational={stage} profileId={profileId} returnId={returnId} />
      <ReturnTabs tab={tab} profileId={profileId} returnId={returnId} />
      <ReturnPanelFade panel={tab}>
      <ReturnPanel
        tab={tab}
        profileId={profileId}
        returnId={returnId}
        gate={gate}
        preparer={authors.get(item.owner ?? "") || "Unassigned"}
        reviewer={authors.get(item.reviewerId ?? "") || "Unassigned"}
        invoice={invoice}
        messages={returnMessages}
        authors={authors}
        workflowState={workflowState}
        teammates={teammates}
        entries={entries}
        fileId={query.file ?? null}
        showOrganizer={item.stage === "documents" && missingOrganizer(item.taxpayerType, threads, item.desk).length > 0}
        email={client.email}
        filings={filings}
        authorizations={authorizations}
        advanceAction={advanceAction}
        sendBackAction={sendBackAction}
        openYearAction={openYearAction}
      />
      </ReturnPanelFade>
    </main>
  );
}

function ReturnPanel({
  tab,
  profileId,
  returnId,
  gate,
  preparer,
  reviewer,
  invoice,
  messages,
  authors,
  workflowState,
  teammates,
  entries,
  fileId,
  showOrganizer,
  email,
  filings,
  authorizations,
  advanceAction,
  sendBackAction,
  openYearAction,
}: {
  tab: ReturnTab;
  profileId: string;
  returnId: string;
  gate: GateInput;
  preparer: string;
  reviewer: string;
  invoice: GateInput["invoice"];
  messages: Parameters<typeof ActivityTab>[0]["messages"];
  authors: Map<string, string>;
  workflowState: ReturnType<typeof getReturnWorkflowState>;
  teammates: { id: string; name: string }[];
  entries: ReturnType<typeof documentEntries>;
  fileId: string | null;
  showOrganizer: boolean;
  email: string;
  filings: GateInput["filings"];
  authorizations: GateInput["authorizations"];
  advanceAction: (data: FormData) => Promise<void>;
  sendBackAction: (data: FormData) => Promise<void>;
  openYearAction: (() => Promise<void>) | null;
}) {
  switch (tab) {
    case "overview":
      return (
        <OverviewTab
          profileId={profileId}
          returnId={returnId}
          email={email}
          state={workflowState}
          messages={messages}
          authors={authors}
        />
      );
    case "documents":
      return (
        <DocumentsTab
          profileId={profileId}
          returnId={returnId}
          entries={entries}
          fileId={fileId}
          showOrganizer={showOrganizer}
        />
      );
    case "preparation":
      return (
        <PreparationTab
          profileId={profileId}
          returnId={returnId}
          gate={gate}
          preparer={preparer}
          files={entries}
          teammates={teammates}
          advanceAction={advanceAction}
        />
      );
    case "review":
      return (
        <ReviewTab
          profileId={profileId}
          returnId={returnId}
          gate={gate}
          reviewer={reviewer}
          teammates={teammates}
          authorizations={authorizations}
          messages={messages}
          advanceAction={advanceAction}
          sendBackAction={sendBackAction}
        />
      );
    case "filing":
      return (
        <FilingTab
          profileId={profileId}
          returnId={returnId}
          gate={gate}
          filings={filings}
          invoice={invoice}
          preparer={preparer}
          advanceAction={advanceAction}
          sendBackAction={sendBackAction}
          openYearAction={openYearAction}
        />
      );
    case "activity":
      return <ActivityTab messages={messages} authors={authors} />;
    default: {
      const exhaustive: never = tab;
      return exhaustive;
    }
  }
}
