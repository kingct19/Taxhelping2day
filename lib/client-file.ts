import { taxpayerTypeLabel } from "@/lib/types";
import type { TeamReturn } from "@/lib/return-workflow";

export const clientTabs = ["overview", "returns", "files", "signed"] as const;
export type ClientTab = (typeof clientTabs)[number];

export function isClientTab(value: string | undefined): value is ClientTab {
  return clientTabs.some((tab) => tab === value);
}

export function clientTabHref(profileId: string, tab: ClientTab): string {
  if (tab === "overview") return `/contacts/${profileId}`;
  return `/contacts/${profileId}?tab=${tab}`;
}

export function isFiledReturn(item: TeamReturn): boolean {
  if (item.archivedAt) return true;
  switch (item.stage) {
    case "delivery":
    case "renewal":
      return true;
    case "lead":
    case "onboarding":
    case "documents":
    case "preparation":
    case "review":
    case "approval":
    case "filing":
    case "canceled":
      return false;
    default: {
      const exhaustive: never = item.stage;
      return exhaustive;
    }
  }
}

function byYear(a: TeamReturn, b: TeamReturn): number {
  return b.taxYear - a.taxYear || a.entity.localeCompare(b.entity);
}

export function partitionReturns(returns: TeamReturn[]): { open: TeamReturn[]; filed: TeamReturn[] } {
  const sorted = [...returns].sort(byYear);
  return {
    open: sorted.filter((item) => !isFiledReturn(item)),
    filed: sorted.filter(isFiledReturn),
  };
}

export function returnTitle(item: TeamReturn, labels: Record<string, string>): string {
  const label = labels[item.filingTypeId || item.taxpayerType] ?? taxpayerTypeLabel(item.taxpayerType);
  return `${item.taxYear} ${label.toLowerCase()} return`;
}
