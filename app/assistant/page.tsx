import { AssistantDesk } from "@/components/assistant/assistant-desk";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  await requireProfile("staff");
  return <AssistantDesk />;
}
