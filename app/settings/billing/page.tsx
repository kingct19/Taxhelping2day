import { DeskGap } from "@/components/settings/desk-gap";
import { SettingsField, SettingsSection } from "@/components/settings/settings-section";

export default function BillingPage() {
  return (
    <DeskGap title="Billing" description="How the practice is paid." detail="The fee is named in the engagement letter.">
      <SettingsSection title="Subscription" description="This desk does not run a software subscription for clients.">
        <SettingsField id="bill-plan" label="Plan" value="None" hint="There is no invoice list in the desk." />
        <SettingsField id="bill-fee" label="Client fee" value="Named in the engagement letter" />
      </SettingsSection>
    </DeskGap>
  );
}
