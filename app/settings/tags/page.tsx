import { DeskGap } from "@/components/settings/desk-gap";
import { SettingsSection } from "@/components/settings/settings-section";
import { Badge } from "@/components/ui/badge";

const groups = [
  { label: "Season", detail: "Profile, letter, documents, ready to prepare." },
  { label: "Taxpayer", detail: "Individual, business, or nonprofit." },
  { label: "Needs a look", detail: "Form 2848 still open, or identity still open." },
] as const;

export default function TagsPage() {
  return (
    <DeskGap title="Tags" description="How a file is grouped." detail="Files are grouped by the season and the kind of taxpayer.">
      <SettingsSection title="Groups on the inbox" description="These are the folders. The desk does not add free-form tags.">
        <ul className="flex flex-col gap-3">
          {groups.map((group) => (
            <li key={group.label} className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-sm font-medium">{group.label}</span>
                <span className="block text-xs text-muted-foreground">{group.detail}</span>
              </span>
              <Badge variant="success">In use</Badge>
            </li>
          ))}
        </ul>
      </SettingsSection>
    </DeskGap>
  );
}
