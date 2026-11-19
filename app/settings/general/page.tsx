import { SettingsField, SettingsSection } from "@/components/settings/settings-section";
import { SettingsFrame } from "@/components/settings/settings-frame";
import { firm } from "@/lib/firm";

export default function GeneralSettingsPage() {
  return (
    <SettingsFrame title="General" description="Workspace name, customer-facing name, and how the practice is reached.">
      <SettingsSection title="Workspace" description="The name clients see, and the address the practice uses.">
        <SettingsField id="ws-name" label="Workspace name" value={firm.legalName} />
        <SettingsField
          id="ws-customer-name"
          label="Customer-facing name"
          value={firm.name}
          hint="Shown on the site, in the portal, and in messages."
        />
        <SettingsField id="ws-email" label="Email" value={firm.email} hint="The address clients write, and the reply-to for invitations." />
        <SettingsField id="ws-phone" label="Phone" value={firm.phone} />
        <SettingsField
          id="ws-address"
          label="Mailing address"
          value={`${firm.mailingAddress}, ${firm.city}, ${firm.region} ${firm.postalCode}`}
        />
      </SettingsSection>
      <SettingsSection title="Localization" description="The time zone and language used on the desk.">
        <SettingsField id="ws-timezone" label="Time zone" value="America/Chicago" />
        <SettingsField id="ws-language" label="Default language" value="English" />
        <SettingsField id="ws-date" label="Date format" value="MMM D, YYYY" />
      </SettingsSection>
    </SettingsFrame>
  );
}
