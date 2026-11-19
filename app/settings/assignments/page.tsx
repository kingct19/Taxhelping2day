import { DeskGap } from "@/components/settings/desk-gap";
import { SettingsField, SettingsSection } from "@/components/settings/settings-section";
import { firm } from "@/lib/firm";

export default function AssignmentsPage() {
  return (
    <DeskGap title="Assignments" description="Who a file is handed to." detail="The file stays with the practice.">
      <SettingsSection title="Who works the file" description="The desk does not auto-assign a file to a teammate.">
        <SettingsField id="assign-lead" label="Practice" value={firm.representative} />
        <SettingsField id="assign-rule" label="Rule" value="Stays with the practice" hint="Open the file from the inbox. It is not routed to a queue." />
      </SettingsSection>
    </DeskGap>
  );
}