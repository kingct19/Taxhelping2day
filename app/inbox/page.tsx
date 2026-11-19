import { InboxView } from "@/components/inbox/inbox-view";
import type { InboxConversation, InboxDeskData, InboxFile } from "@/components/inbox/inbox-state";
import { requireProfile } from "@/lib/auth";
import { firm } from "@/lib/firm";
import { getStore } from "@/lib/store";
import type { DocumentRecord, Message, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

function locationFor(profile: Profile) {
  return [profile.city, profile.state].filter(Boolean).join(", ");
}

function filesFor(documents: DocumentRecord[], messages: Message[]): InboxFile[] {
  const files = new Map<string, InboxFile>();
  for (const document of documents) {
    files.set(document.id, {
      id: document.id,
      name: document.filename,
      url: `/files/documents/${document.id}`,
      size: "On file",
      kind: document.contentType.startsWith("image/") ? "image" : "file",
    });
  }
  for (const message of messages) {
    for (const attachment of message.attachments ?? []) {
      files.set(attachment.id, {
        id: attachment.id,
        name: attachment.name,
        url: attachment.url,
        size: attachment.size || "On file",
        kind: attachment.type,
      });
    }
  }
  return [...files.values()];
}

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const staff = await requireProfile("staff");
  const { id } = await searchParams;
  const store = getStore();
  const [inbox, profiles, tasks] = await Promise.all([store.listInbox(), store.listProfiles(), store.listTasks()]);
  const clients = profiles.filter((profile) => profile.role === "client");
  const documents = await Promise.all(clients.map(async (client) => ({ profileId: client.id, documents: await store.listDocuments(client.id) })));
  const documentsByProfile = new Map(documents.map((item) => [item.profileId, item.documents]));
  const people = new Map(profiles.map((profile) => [profile.id, profile]));
  const conversations: InboxConversation[] = inbox.conversations.flatMap((conversation) => {
    const contact = people.get(conversation.profileId);
    if (!contact || contact.role !== "client") return [];
    const messages = inbox.messages
      .filter((message) => message.conversationId === conversation.id)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    return [
      {
        ...conversation,
        contactName: contact.name || contact.email,
        contactEmail: contact.email,
        contactPhone: contact.phone,
        contactLocation: locationFor(contact),
        messages,
        files: filesFor(documentsByProfile.get(contact.id) ?? [], messages),
      },
    ];
  });
  const data: InboxDeskData = {
    currentUserId: staff.id,
    firmName: firm.name,
    selectedProfileId: id ?? null,
    teammates: profiles
      .filter((profile) => profile.role === "staff")
      .map((profile) => ({ id: profile.id, name: profile.name || "Staff", email: profile.email })),
    contacts: clients.map((client) => ({
      id: client.id,
      name: client.name || client.email,
      email: client.email,
      phone: client.phone,
      location: locationFor(client),
    })),
    tasks: tasks.map((task) => ({ id: task.id, profileId: task.profileId })),
    conversations,
  };

  return <InboxView data={data} />;
}
