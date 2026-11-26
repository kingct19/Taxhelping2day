import { cookies } from "next/headers";
import { CancelReturnButton } from "@/components/portal/cancel-return-button";
import { decodeView, viewCookie } from "@/lib/view-cookie";
import { FileReturnDialog } from "@/components/portal/file-return-dialog";
import { RequirementCards } from "@/components/portal/requirement-cards";
import { ReturnDocuments } from "@/components/portal/return-documents";
import { ReturnList } from "@/components/portal/return-list";
import { requireProfile } from "@/lib/auth";
import { refreshProfileLetters } from "@/lib/docuseal";
import { currentFilingYear } from "@/lib/automations";
import { deriveClientStage, documentsForReturn, requirementCards, returnTypeName, type RequirementCardModel, type RequirementStatus } from "@/lib/client-home";
import { requestThreads } from "@/lib/request-thread";
import { clientMayCancel } from "@/lib/return-workflow";
import { seasonFor } from "@/lib/season";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

type DocumentBucket = "need" | "review" | "complete";

function documentBucket(status: RequirementStatus): DocumentBucket {
  switch (status) {
    case "needed":
    case "correction":
      return "need";
    case "uploaded":
    case "under_review":
      return "review";
    case "accepted":
    case "not_applicable":
      return "complete";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function returnBucket(cards: RequirementCardModel[]): DocumentBucket {
  if (cards.length === 0 || cards.some((card) => documentBucket(card.status) === "need")) return "need";
  if (cards.some((card) => documentBucket(card.status) === "review")) return "review";
  return "complete";
}

function returnSummary(need: number, review: number, complete: number): string {
  if (need === 0 && review === 0 && complete > 0) return "These records are complete.";
  const parts: string[] = [];
  if (need > 0) parts.push(`${need} ${need === 1 ? "file still needs" : "files still need"} to be sent`);
  if (review > 0) parts.push(`${review} ${review === 1 ? "is" : "are"} under review`);
  if (complete > 0) parts.push(`${complete} ${complete === 1 ? "is" : "are"} complete`);
  if (parts.length === 0) return "No records are on this return yet.";
  return `${parts.join(". ")}.`;
}

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ return?: string }> }) {
  const { return: requested } = await searchParams;
  const savedReturn = decodeView((await cookies()).get(viewCookie.portalReturn)?.value);
  const profile = await requireProfile("client");
  await refreshProfileLetters(profile.id);
  const store = getStore();
  const [documents, messages, returns, catalog, signatures, taxFilings] = await Promise.all([
    store.listDocuments(profile.id),
    store.listMessages(profile.id),
    store.listTeamReturns(),
    store.getFilingCatalog(),
    store.listSignatures(profile.id),
    store.listFilings(),
  ]);
  const own = returns
    .filter((item) => item.profileId === profile.id && !item.archivedAt)
    .sort((left, right) => Number(left.stage === "canceled") - Number(right.stage === "canceled") || right.taxYear - left.taxYear || left.id.localeCompare(right.id));
  const years = [...new Set(own.map((item) => item.taxYear))];
  if (years.length === 0) years.push(currentFilingYear());
  const filingYear = currentFilingYear();
  const choiceYears = [...new Set([filingYear + 1, filingYear, filingYear - 1, filingYear - 2, filingYear - 3, filingYear - 4, filingYear - 5, filingYear - 6, ...own.map((item) => item.taxYear)])].sort((left, right) => right - left);
  const choiceTypes = catalog.types.filter((type) => !type.retired).map((type) => ({ id: type.id, label: type.label, form: type.form }));
  const taken = own.filter((item) => item.stage !== "canceled").map((item) => ({ year: item.taxYear, typeId: item.filingTypeId || item.taxpayerType }));
  const sections = years.map((year) => {
    const inYear = own.filter((item) => item.taxYear === year);
    const filings = inYear.map((item) => {
      const typeId = item.filingTypeId || item.taxpayerType;
      const name = returnTypeName(item, catalog);
      const threads = requestThreads(messages.filter((message) => message.returnId === item.id));
      const scoped = documentsForReturn(item.id, documents, messages);
      const attachmentIds = messages
        .filter((message) => message.returnId === item.id)
        .flatMap((message) => message.attachments.flatMap((file) => (file.documentId ? [file.documentId] : [])));
      const shared = {
        profile,
        documents: scoped,
        threads,
        attachmentIds,
        catalog,
        intake: { answered: true as const, needs: [] },
        returnId: item.id,
      };
      const cards = [
        ...requirementCards({ ...shared, types: [typeId], scope: "standard" }),
        ...requirementCards({ ...shared, types: [typeId], scope: "extras" }),
      ];
      const bucket = returnBucket(cards);
      const season = seasonFor(
        profile,
        signatures,
        scoped,
        { answered: item.desk.intakeAnswered, needs: item.desk.filingNeeds },
        catalog,
        { threads, filingTypeId: typeId },
      );
      const stage = deriveClientStage({
        returnStage: item.stage,
        filings: taxFilings.filter((filing) => filing.returnId === item.id),
        season,
      });
      return {
        id: item.id,
        heading: `${year} · ${name.label} · Form ${name.form}`,
        title: `${year} ${name.label}`,
        form: name.form,
        bucket,
        stage,
        canceled: item.stage === "canceled",
        canCancel: clientMayCancel(item.stage),
        need: cards.filter((card) => documentBucket(card.status) === "need"),
        review: cards.filter((card) => documentBucket(card.status) === "review"),
        complete: cards.filter((card) => documentBucket(card.status) === "complete"),
      };
    });
    return { year, returns: filings };
  });
  const filings = sections.flatMap((section) => section.returns);
  const selected = filings.find((item) => item.id === requested) ?? filings.find((item) => item.id === savedReturn) ?? filings.find((item) => item.bucket === "need") ?? filings[0] ?? null;
  const needCount = selected?.need.length ?? 0;
  const reviewCount = selected?.review.length ?? 0;
  const completeCount = selected?.complete.length ?? 0;
  const defaultTab = needCount > 0 ? "need" : reviewCount > 0 ? "review" : "complete";

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="font-serif text-3xl">Returns</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Each tax year keeps its own records. A file you upload stays with that return. When the required records are in, that year is ready for the firm to review.
          </p>
        </div>
        {choiceTypes.length > 0 ? (
          <FileReturnDialog years={choiceYears} types={choiceTypes} taken={taken} defaultYear={filingYear} />
        ) : null}
      </header>
      {selected ? (
        <div className="grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <ReturnList
            selectedId={selected.id}
            items={filings.map((item) => ({
              id: item.id,
              title: item.title,
              form: item.form,
              canceled: item.canceled,
              need: item.need.length,
              review: item.review.length,
              complete: item.complete.length,
            }))}
          />
          <ReturnDocuments
            returnId={selected.id}
            defaultTab={defaultTab}
            heading={selected.heading}
            canceled={selected.canceled}
            stage={selected.stage}
            summary={returnSummary(needCount, reviewCount, completeCount)}
            cancel={selected.canCancel ? <CancelReturnButton returnId={selected.id} label={selected.heading} /> : null}
            counts={{ need: needCount, review: reviewCount, complete: completeCount }}
            panels={{
              need: needCount === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing is waiting on a file.</p>
              ) : (
                <RequirementCards cards={selected.need} />
              ),
              review: reviewCount === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing is with the firm right now.</p>
              ) : (
                <RequirementCards cards={selected.review} />
              ),
              complete: completeCount === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing is finished yet. Accepted records show up here.</p>
              ) : (
                <RequirementCards cards={selected.complete} />
              ),
            }}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">You have no open returns. File a new return to start a document list.</p>
      )}
    </div>
  );
}
