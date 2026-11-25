import { AutomationDesk } from "@/components/settings/automation-desk";
import { SettingsFrame } from "@/components/settings/settings-frame";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const store = getStore();
  const [rules, tags] = await Promise.all([store.listAutomations(), store.listTags()]);

  return (
    <SettingsFrame title="Automations" description="Move a return, send an email, or change a tag when something happens.">
      <AutomationDesk rules={rules} tags={tags} />
    </SettingsFrame>
  );
}
