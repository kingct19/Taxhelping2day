import { SettingsFrame } from "@/components/settings/settings-frame";
import { TagManager } from "@/components/settings/tag-manager";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const tags = await getStore().listTags();

  return (
    <SettingsFrame title="Tags" description="Names the firm can put on a return. A tag on a return can start an automation.">
      <TagManager tags={tags} />
    </SettingsFrame>
  );
}
