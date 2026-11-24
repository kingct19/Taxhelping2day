"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActivityIcon, FolderOpenIcon, LayoutDashboardIcon, ListChecksIcon, SendIcon, ShieldCheckIcon, type LucideIcon } from "lucide-react";
import { Tabs, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isReturnTab, returnTabHref, returnTabs, type ReturnTab } from "@/lib/return-progress";

const labels: Record<ReturnTab, string> = {
  overview: "Overview",
  documents: "Documents",
  preparation: "Preparation",
  review: "Review & Approval",
  filing: "Filing & Delivery",
  activity: "Activity",
};

const icons: Record<ReturnTab, LucideIcon> = {
  overview: LayoutDashboardIcon,
  documents: FolderOpenIcon,
  preparation: ListChecksIcon,
  review: ShieldCheckIcon,
  filing: SendIcon,
  activity: ActivityIcon,
};

export function ReturnTabs({ tab, profileId, returnId }: { tab: ReturnTab; profileId: string; returnId: string }) {
  const router = useRouter();
  const [requested, setRequested] = useState<ReturnTab | null>(null);
  const shown = requested !== null && requested !== tab ? requested : tab;

  return (
    <Tabs
      value={shown}
      onValueChange={(value) => {
        if (typeof value !== "string" || !isReturnTab(value) || value === shown) return;
        setRequested(value);
        router.push(returnTabHref(profileId, returnId, value), { scroll: false });
      }}
    >
      <TabsList variant="line" className="relative h-9 w-full justify-start gap-1 overflow-x-auto">
        {returnTabs.map((item) => {
          const Icon = icons[item];
          return (
            <TabsTrigger key={item} value={item} className="after:hidden">
              <Icon data-icon="inline-start" />
              {labels[item]}
            </TabsTrigger>
          );
        })}
        <TabsIndicator />
      </TabsList>
    </Tabs>
  );
}
