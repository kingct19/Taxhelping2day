import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsFrame } from "@/components/settings/settings-frame";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function OfficeHoursPage() {
  return (
    <SettingsFrame title="Office hours" description="When the practice is open.">
      <SettingsSection title="Weekly hours" description="Hours are not published yet, so none are shown here.">
        <ul className="flex flex-col gap-2">
          {days.map((day) => (
            <li key={day} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <span>{day}</span>
              <span className="text-muted-foreground">Not published</span>
            </li>
          ))}
        </ul>
      </SettingsSection>
    </SettingsFrame>
  );
}
