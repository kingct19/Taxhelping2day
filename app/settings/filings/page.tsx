import { FilingCatalogEditor } from "@/components/settings/filing-catalog-editor";
import { SettingsFrame } from "@/components/settings/settings-frame";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function FilingsSettingsPage() {
  const store = getStore();
  const [catalog, returns] = await Promise.all([store.getFilingCatalog(), store.listTeamReturns()]);
  const usedIds = [...new Set(returns.map((row) => row.filingTypeId || row.taxpayerType))];

  return (
    <SettingsFrame title="Filing types" description="The returns a client can choose, and the documents each one asks for.">
      <FilingCatalogEditor catalog={catalog} usedIds={usedIds} />
    </SettingsFrame>
  );
}
