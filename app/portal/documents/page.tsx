import { FilingTypeForm } from "@/components/portal/filing-needs-form";
import { requireProfile } from "@/lib/auth";
import { requirementCards } from "@/lib/client-home";
import { requestThreads } from "@/lib/request-thread";
import { getStore } from "@/lib/store";
import { orderedFilingTypes } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const profile = await requireProfile("client");
  const store = getStore();
  const [documents, messages, returns, catalog] = await Promise.all([
    store.listDocuments(profile.id),
    store.listMessages(profile.id),
    store.listTeamReturns(),
    store.getFilingCatalog(),
  ]);
  const own = returns.filter((item) => item.profileId === profile.id && !item.archivedAt);
  const ids = catalog.types.map((type) => type.id);
  const chosen = profile.filingTypes !== undefined
    ? orderedFilingTypes(profile.filingTypes, ids)
    : ids.filter((id) => own.some((item) => item.desk.intakeAnswered && (item.filingTypeId || item.taxpayerType) === id));
  const returnIds = new Set(own.map((item) => item.id));
  const threads = requestThreads(messages.filter((message) => !message.returnId || returnIds.has(message.returnId)));
  const attachmentIds = messages.flatMap((message) => message.attachments.flatMap((file) => (file.documentId ? [file.documentId] : [])));
  const visible = catalog.types.filter((type) => !type.retired || chosen.includes(type.id));
  const shared = {
    profile,
    documents,
    threads,
    attachmentIds,
    catalog,
    intake: { answered: true as const, needs: [] },
  };
  const sections = visible.map((type) => ({
    id: type.id,
    label: type.label,
    form: type.form,
    cards: requirementCards({ ...shared, types: [type.id], scope: "standard" }),
  }));
  const extras = requirementCards({ ...shared, types: visible.map((type) => type.id), scope: "extras" });

  return (
    <div className="grid gap-4">
      <header className="grid gap-1">
        <h1 className="font-serif text-3xl">Documents</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Check every return you are filing. The records for that return appear on their own. If the firm needs anything else, they will request it here.
        </p>
      </header>
      <FilingTypeForm
        returnId={own[0]?.id}
        selected={chosen}
        options={visible.map((type) => ({ id: type.id, label: type.label, form: type.form }))}
        sections={sections}
        extras={extras}
      />
    </div>
  );
}
