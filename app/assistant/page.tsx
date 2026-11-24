import { AssistantDesk } from "@/components/assistant/assistant-desk";
import { requireProfile } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ prompt?: string }> }) {
  const { prompt } = await searchParams;
  await requireProfile("staff");
  const people = await getStore().listProfiles();
  const clients = people
    .filter((person) => person.role === "client")
    .map((person) => ({ id: person.id, name: person.name || person.email, email: person.email }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return <AssistantDesk prompt={prompt} clients={clients} />;
}
