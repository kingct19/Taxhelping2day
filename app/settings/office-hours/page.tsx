import { OfficeHoursEditor } from "@/components/settings/office-hours-editor";
import { SettingsFrame } from "@/components/settings/settings-frame";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function OfficeHoursPage() {
  const record = await getStore().getOfficeHours();

  return (
    <SettingsFrame title="Office hours" description="What clients see about when a message gets a reply.">
      <OfficeHoursEditor saved={record.saved} hours={record.hours} />
    </SettingsFrame>
  );
}
