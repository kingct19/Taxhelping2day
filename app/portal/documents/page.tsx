import { RequirementCards } from "@/components/portal/requirement-cards";
import { requireProfile } from "@/lib/auth";
import { pickReturn, requirementCards } from "@/lib/client-home";
import { requestThreads } from "@/lib/request-thread";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const profile = await requireProfile("client");
  const store = getStore();
  const [documents, messages, returns] = await Promise.all([
    store.listDocuments(profile.id),
    store.listMessages(profile.id),
    store.listTeamReturns(),
  ]);
  const current = pickReturn(returns.filter((item) => item.profileId === profile.id));
  const threads = requestThreads(messages.filter((message) => !current || !message.returnId || message.returnId === current.id));
  const attachmentIds = messages.flatMap((message) => message.attachments.flatMap((file) => (file.documentId ? [file.documentId] : [])));
  const cards = requirementCards({ profile, documents, threads, attachmentIds });

  return (
    <div className="grid gap-4">
      <header className="grid gap-1">
        <h1 className="font-serif text-3xl">Documents</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Upload each item to its request. A file stays under review until the firm accepts it.
        </p>
      </header>
      <RequirementCards cards={cards} />
    </div>
  );
}
