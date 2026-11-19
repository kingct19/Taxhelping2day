import { SettingsField, SettingsSection } from "@/components/settings/settings-section";
import { SettingsFrame } from "@/components/settings/settings-frame";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SecuritySettingsPage() {
  return (
    <SettingsFrame title="Security" description="Protect the desk, the files, and the people who sign in.">
      <Tabs defaultValue="workspace">
        <TabsList variant="line" className="h-12 w-full justify-start gap-6">
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>
        <TabsContent value="workspace" className="pt-6">
          <SettingsSection title="Sign-in" description="Who can open the desk and the client portal.">
            <SettingsField id="sec-method" label="Staff and clients" value="Email code" hint="A code is sent to the address on file." />
            <SettingsField id="sec-signup" label="Public registration" value="Closed" hint="A client is added only when the practice sends an invitation." />
          </SettingsSection>
        </TabsContent>
        <TabsContent value="data" className="pt-6">
          <SettingsSection title="Client files" description="What stays with the practice.">
            <SettingsField id="sec-tax-id" label="Taxpayer IDs" value="Encrypted" hint="The desk shows the last four digits. The full number is not shown on these pages." />
            <SettingsField id="sec-docs" label="Documents" value="Kept on the file" hint="Uploads are not sent to a model." />
          </SettingsSection>
        </TabsContent>
      </Tabs>
    </SettingsFrame>
  );
}
