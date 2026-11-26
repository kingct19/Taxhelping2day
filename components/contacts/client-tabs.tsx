"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileTextIcon, FolderOpenIcon, LayoutDashboardIcon, PenLineIcon, type LucideIcon } from "lucide-react";
import { Tabs, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clientTabHref, clientTabs, isClientTab, type ClientTab } from "@/lib/client-file";

const labels: Record<ClientTab, string> = {
  overview: "Overview",
  returns: "Returns",
  files: "Files",
  signed: "Signed documents",
};

const icons: Record<ClientTab, LucideIcon> = {
  overview: LayoutDashboardIcon,
  returns: FileTextIcon,
  files: FolderOpenIcon,
  signed: PenLineIcon,
};

export function ClientTabs({ tab, profileId }: { tab: ClientTab; profileId: string }) {
  const router = useRouter();
  const [requested, setRequested] = useState<ClientTab | null>(null);
  const shown = requested !== null && requested !== tab ? requested : tab;

  return (
    <Tabs
      value={shown}
      onValueChange={(value) => {
        if (typeof value !== "string" || !isClientTab(value) || value === shown) return;
        setRequested(value);
        router.push(clientTabHref(profileId, value), { scroll: false });
      }}
    >
      <TabsList variant="line" className="relative h-9 w-full justify-start gap-1 overflow-x-auto">
        {clientTabs.map((item) => {
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
