import { AssistantDesk } from "@/components/assistant/assistant-desk";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ prompt?: string }> }) {
  const { prompt } = await searchParams;
  await requireProfile("staff");
  return <AssistantDesk prompt={prompt} />;
}
