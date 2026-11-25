import { organizerBody, requestsFor } from "@/lib/engagement";
import type { ReturnDesk } from "@/lib/return-desk";
import { requestThreads } from "@/lib/request-thread";
import { getStore } from "@/lib/store";

export async function seedOrganizer(profileId: string, returnId: string, authorId: string, filingTypeId: string, desk?: Pick<ReturnDesk, "intakeAnswered" | "filingNeeds">) {
  const store = getStore();
  const [messages, catalog] = await Promise.all([store.listMessages(profileId), store.getFilingCatalog()]);
  const threads = requestThreads(messages.filter((row) => row.returnId === returnId));
  for (const request of requestsFor(filingTypeId, desk, catalog).filter((item) => item.required)) {
    if (threads.some((thread) => thread.root.body.startsWith(`Organizer: ${request.title}.`))) continue;
    await store.addMessage({
      profileId,
      returnId,
      authorId,
      authorRole: "staff",
      kind: "message",
      body: organizerBody(request.title, request.detail),
      requestState: "open",
      requestBlock: "start",
    });
  }
}
