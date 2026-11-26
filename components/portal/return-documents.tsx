"use client";

import { type ReactNode } from "react";
import { useSavedState } from "@/hooks/use-saved-state";
import { StageChecklist } from "@/components/portal/stage-checklist";
import { ReturnPanelFade } from "@/components/return-workspace/panel-fade";
import { Tabs, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clientStageDetail, type ClientStage } from "@/lib/client-home";

const documentTabs = ["need", "review", "complete"] as const;
type DocumentTab = (typeof documentTabs)[number];

const labels: Record<DocumentTab, string> = {
  need: "Need files",
  review: "Under review",
  complete: "Complete",
};

function isDocumentTab(value: unknown): value is DocumentTab {
  return typeof value === "string" && documentTabs.some((tab) => tab === value);
}

function DocumentBody({
  returnId,
  defaultTab,
  heading,
  canceled = false,
  stage,
  summary,
  cancel,
  counts,
  panels,
}: {
  returnId: string;
  defaultTab: DocumentTab;
  heading: string;
  canceled?: boolean;
  stage: ClientStage;
  summary: string;
  cancel: ReactNode;
  counts: Record<DocumentTab, number>;
  panels: Record<DocumentTab, ReactNode>;
}) {
  const [tab, setTab] = useSavedState<DocumentTab>(`view:portal-tab:${returnId}`, defaultTab, isDocumentTab);

  if (canceled) {
    return (
      <div className="grid gap-3">
        <h2 className="font-serif text-2xl">{heading}</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          You cancelled this return. The firm can see it as canceled. File this year and type again whenever you want to pick it back up.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <StageChecklist stage={stage} />
      <p className="max-w-2xl text-sm text-muted-foreground">{clientStageDetail(stage)}</p>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="font-serif text-2xl">{heading}</h2>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
        {cancel}
      </div>
      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (isDocumentTab(value)) setTab(value);
        }}
        className="gap-5"
      >
        <TabsList variant="line" className="relative h-9 w-fit justify-start gap-1">
          {documentTabs.map((item) => (
            <TabsTrigger key={item} value={item} className="after:hidden">
              {labels[item]}
              <span className="text-muted-foreground">{counts[item]}</span>
            </TabsTrigger>
          ))}
          <TabsIndicator />
        </TabsList>
        <ReturnPanelFade panel={tab} mode="wait">
          {panels[tab]}
        </ReturnPanelFade>
      </Tabs>
    </div>
  );
}

export function ReturnDocuments({
  returnId,
  defaultTab,
  heading,
  canceled = false,
  stage,
  summary,
  cancel,
  counts,
  panels,
}: {
  returnId: string;
  defaultTab: DocumentTab;
  heading: string;
  canceled?: boolean;
  stage: ClientStage;
  summary: string;
  cancel: ReactNode;
  counts: Record<DocumentTab, number>;
  panels: Record<DocumentTab, ReactNode>;
}) {
  return (
    <ReturnPanelFade panel={returnId} mode="wait">
      <DocumentBody key={returnId} returnId={returnId} defaultTab={defaultTab} heading={heading} canceled={canceled} stage={stage} summary={summary} cancel={cancel} counts={counts} panels={panels} />
    </ReturnPanelFade>
  );
}
