import { DeskGap } from "@/components/settings/desk-gap";
import { SettingsField, SettingsSection } from "@/components/settings/settings-section";

export default function MessengerPage() {
  return (
    <DeskGap title="Messenger" description="How clients reach the practice." detail="Clients write from the portal. The practice replies from the inbox.">
      <SettingsSection title="Channel" description="There is no chat widget on the public site.">
        <SettingsField id="msg-site" label="Public site" value="Contact page" hint="Visitors use the phone, the email, and the contact form." />
        <SettingsField id="msg-portal" label="Clients" value="Portal messages" hint="Replies are sent from the client file in the inbox." />
      </SettingsSection>
    </DeskGap>
  );
}
