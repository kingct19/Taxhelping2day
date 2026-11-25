import { RoleAccess } from "@/components/settings/role-access";
import { SignInMethodsEditor } from "@/components/settings/sign-in-methods-editor";
import { SettingsField, SettingsSection } from "@/components/settings/settings-section";
import { SettingsFrame } from "@/components/settings/settings-frame";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SecuritySettingsPage() {
  const methods = await getStore().getSignInMethods();

  return (
    <SettingsFrame title="Security" description="Who can open the desk, how people sign in, and how files are kept.">
      <Tabs defaultValue="workspace">
        <TabsList variant="line" className="h-12 w-full justify-start gap-6">
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>
        <TabsContent value="workspace" className="flex flex-col gap-6 pt-6">
          <RoleAccess />
          <SignInMethodsEditor methods={methods} />
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
