import { DeskGap } from "@/components/settings/desk-gap";
import { SettingsSection } from "@/components/settings/settings-section";
import { Badge } from "@/components/ui/badge";

const rows = [
  { label: "Sign-in code", detail: "Sent when someone asks to sign in.", status: "On" },
  { label: "Portal invitation", detail: "Sent when the practice invites a client or a teammate.", status: "On" },
  { label: "Assignment mail", detail: "The desk does not hand a file to a person by email.", status: "Off" },
  { label: "Daily summary", detail: "The desk does not send a digest.", status: "Off" },
] as const;

export default function NotificationsPage() {
  return (
    <DeskGap title="Notifications" description="Mail when something changes." detail="Sign-in codes and invitations are the messages that go out.">
      <SettingsSection title="Email" description="What leaves the desk, and what stays off.">
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-sm font-medium">{row.label}</span>
                <span className="block text-xs text-muted-foreground">{row.detail}</span>
              </span>
              <Badge variant={row.status === "On" ? "success" : "neutral"}>{row.status}</Badge>
            </li>
          ))}
        </ul>
      </SettingsSection>
    </DeskGap>
  );
}
