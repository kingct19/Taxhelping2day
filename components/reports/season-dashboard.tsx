"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ActivityIcon, ArrowRightIcon, ArrowUpIcon, ArrowDownIcon, ChartColumnIcon, FileTextIcon, LightbulbIcon, ListTodoIcon, PieChartIcon, SendIcon, UserRoundIcon, UsersIcon } from "lucide-react";
import { EChartsBarChart } from "@/components/evilcharts/charts/echarts-bar-chart";
import { LiniqoEmpty, liniqo } from "@/components/liniqo-empty";
import { EChartsPieChart } from "@/components/evilcharts/charts/echarts-pie-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/echarts-chart";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { initials } from "@/lib/inbox-view";
import type { SeasonStage } from "@/lib/season";
import { stageOrder, stages, type Stage, type WaitingOn } from "@/lib/return-workflow";
import { stageTone } from "@/lib/status-tone";
import { taxpayerTypeLabel, taxpayerTypes, type TaskKind, type TaskStatus, type TaxpayerType } from "@/lib/types";
import { cn } from "@/lib/utils";

export type DashboardFile = {
  id: string;
  profileId: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: string;
  taxYear: number;
  entity: string;
  stage: Stage;
  waitingOn: WaitingOn;
  season: SeasonStage;
  taxpayerType: TaxpayerType;
  poa: boolean;
  identity: boolean;
};

export type DashboardTask = {
  kind: TaskKind;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
};

type Range = "7d" | "30d" | "90d" | "all";

const ranges: { id: Range; label: string; days: number | null }[] = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "all", label: "All time", days: null },
];

const phases = [
  { id: "start", label: "Getting started", stages: ["lead", "onboarding", "documents"] },
  { id: "desk", label: "On the desk", stages: ["preparation", "review", "approval"] },
  { id: "file", label: "Filing and delivery", stages: ["filing", "delivery", "renewal"] },
] as const;

function inWindow(iso: string, start: number, end: number) {
  const time = new Date(iso).getTime();
  return time >= start && time < end;
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function formatDelta(value: number) {
  const absolute = Math.abs(value);
  const text = Number.isInteger(absolute) ? String(absolute) : absolute.toFixed(1);
  return `${text}%`;
}

function firstName(name: string) {
  const trimmed = name.trim();
  const local = trimmed.includes("@") ? trimmed.split("@")[0] : trimmed;
  const word = local.split(/[\s._-]+/)[0] || "there";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function greeting(now: number) {
  const hour = new Date(now).getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const seriesConfig = {
  individual: { label: "Individual", colors: { light: ["#1a1a1a"], dark: ["#f4f4f5"] } },
  business: { label: "Business", colors: { light: ["#8a8175"], dark: ["#a1a1aa"] } },
  nonprofit: { label: "Non-profit", colors: { light: ["#c6a15a"], dark: ["#e4c98a"] } },
} satisfies ChartConfig;

const phaseConfig = {
  start: { label: "Getting started", colors: { light: ["#1a1a1a"], dark: ["#f4f4f5"] } },
  desk: { label: "On the desk", colors: { light: ["#8a8175"], dark: ["#a1a1aa"] } },
  file: { label: "Filing and delivery", colors: { light: ["#c6a15a"], dark: ["#e4c98a"] } },
} satisfies ChartConfig;

function fileUrgency(file: DashboardFile) {
  if (file.waitingOn === "staff") return 0;
  if (file.waitingOn === "client") return 1;
  if (file.stage === "delivery" || file.stage === "renewal") return 3;
  return 2;
}

function phaseTone(id: (typeof phases)[number]["id"]) {
  switch (id) {
    case "start":
      return "bg-chart-5";
    case "desk":
      return "bg-chart-3";
    case "file":
      return "bg-chart-2";
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}

function CardHeading({ icon: Icon, title }: { icon: typeof FileTextIcon; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground" />
      <p className="text-sm font-medium">{title}</p>
    </div>
  );
}

export function SeasonDashboard({ files, tasks, now, name }: { files: DashboardFile[]; tasks: DashboardTask[]; now: number; name: string }) {
  const [range, setRange] = useState<Range>("30d");
  const window = ranges.find((item) => item.id === range) ?? ranges[1];

  const stats = useMemo(() => {
    const days = window.days;
    const start = days === null ? 0 : now - days * 86_400_000;
    const previousStart = days === null ? 0 : start - days * 86_400_000;
    const currentFiles = files.filter((file) => inWindow(file.createdAt, start, now + 1));
    const previousFiles = days === null ? [] : files.filter((file) => inWindow(file.createdAt, previousStart, start));
    return { currentFiles, previousFiles, start };
  }, [files, window.days, now]);

  const buckets = useMemo(() => {
    const count = 12;
    const span = window.days ?? 84;
    return Array.from({ length: count }, (_, index) => {
      const bucketEnd = now - ((count - index - 1) * span * 86_400_000) / count;
      const bucketStart = now - ((count - index) * span * 86_400_000) / count;
      const opened = files.filter((file) => inWindow(file.createdAt, bucketStart, bucketEnd));
      return {
        label: new Date(bucketEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        counts: taxpayerTypes.map((type) => opened.filter((file) => file.taxpayerType === type).length),
        total: opened.length,
      };
    });
  }, [files, now, window.days]);

  const openedDelta = percentChange(stats.currentFiles.length, stats.previousFiles.length);
  const live = files.length;
  const phaseCounts = phases.map((phase) => ({
    ...phase,
    count: files.filter((file) => (phase.stages as readonly Stage[]).includes(file.stage)).length,
  }));
  const previousStart = window.days === null ? 0 : stats.start - window.days * 86_400_000;
  const newClients = new Set(stats.currentFiles.map((file) => file.profileId)).size;
  const previousClients = new Set(stats.previousFiles.map((file) => file.profileId)).size;
  const clientDelta = percentChange(newClients, previousClients);
  const currentTasks = tasks.filter((task) => inWindow(task.createdAt, stats.start, now + 1));
  const previousTasks = window.days === null ? [] : tasks.filter((task) => inWindow(task.createdAt, previousStart, stats.start));
  const taskDelta = percentChange(currentTasks.length, previousTasks.length);
  const seasonData = buckets.map((bucket) => ({
    label: bucket.label,
    individual: bucket.counts[0] ?? 0,
    business: bucket.counts[1] ?? 0,
    nonprofit: bucket.counts[2] ?? 0,
  }));
  const phaseSlices = phaseCounts
    .filter((phase) => phase.count > 0)
    .map((phase) => ({ phase: phase.id, count: phase.count }));
  const onStaff = files.filter((file) => file.waitingOn === "staff").length;
  const onClient = files.filter((file) => file.waitingOn === "client").length;
  const notWaiting = files.length - onStaff - onClient;
  const missingIdentity = files.filter((file) => !file.identity).length;
  const missingPoa = files.filter((file) => !file.poa).length;
  const openTaskCount = tasks.filter((task) => task.status === "open").length;
  const delivered = files.filter((file) => file.stage === "delivery" || file.stage === "renewal").length;
  const deskFiles = [...files]
    .sort((a, b) => fileUrgency(a) - fileUrgency(b) || stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage))
    .slice(0, 6);

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-12 gap-4">
          <Card className="relative col-span-12 shadow-none xl:col-span-8 lg:min-h-48">
            <CardContent className="flex flex-col gap-4 lg:pe-64">
              <div className="flex max-w-md flex-col gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">{greeting(now)}, {firstName(name)}</h1>
                <p className="text-sm text-muted-foreground">
                  {live === 0
                    ? "No returns are open yet. A lead from Contacts starts the season."
                    : "Stay informed with today's desk. Here is the work still moving."}
                </p>
                <Button nativeButton={false} className="mt-2 w-fit rounded-lg" render={<Link href="/returns" />}>
                  View returns
                  <ArrowRightIcon />
                </Button>
              </div>
              <Image
                src="/images/backgrounds/analytic-user.svg"
                alt=""
                width={222}
                height={182}
                unoptimized
                className="greeting-art dark:hidden"
              />
              <Image
                src="/images/backgrounds/analytic-user-dark.svg"
                alt=""
                width={222}
                height={188}
                unoptimized
                className="greeting-art hidden dark:block"
              />
            </CardContent>
          </Card>

          <Card className="col-span-12 shadow-none xl:col-span-4">
            <CardContent className="flex h-full flex-col gap-4">
              <CardHeading icon={LightbulbIcon} title="Waiting now" />
              <div>
                <p className="text-3xl font-semibold tabular-nums">{onStaff.toLocaleString("en-US")}</p>
                <p className="mt-1 text-xs text-muted-foreground">waiting on you</p>
              </div>
              <ul className="mt-auto flex flex-col gap-3 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">On the client</span>
                  <span className="tabular-nums">{onClient.toLocaleString("en-US")}</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Not waiting</span>
                  <span className="tabular-nums">{notWaiting.toLocaleString("en-US")}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="col-span-12 shadow-none xl:col-span-8">
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <CardHeading icon={ChartColumnIcon} title="Season overview" />
                  <p className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold tabular-nums">{stats.currentFiles.length.toLocaleString("en-US")}</span>
                    <span className="text-xs text-muted-foreground">returns opened</span>
                    <Delta value={openedDelta} />
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <label>
                    <span className="sr-only">Range</span>
                    <select
                      value={range}
                      onChange={(event) => {
                        const next = ranges.find((item) => item.id === event.target.value);
                        if (next) setRange(next.id);
                      }}
                      className="h-8 appearance-none rounded-md bg-muted px-2.5 text-xs font-medium text-foreground outline-none"
                    >
                      {ranges.map((item) => (
                        <option key={item.id} value={item.id}>{item.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <EChartsBarChart data={seasonData} config={seriesConfig} stackType="stacked" xDataKey="label" className="h-64 w-full" barRadius={4}>
                <EChartsBarChart.Grid />
                <EChartsBarChart.XAxis dataKey="label" />
                <EChartsBarChart.YAxis />
                <EChartsBarChart.Legend />
                <EChartsBarChart.Tooltip />
                <EChartsBarChart.Bar dataKey="individual" />
                <EChartsBarChart.Bar dataKey="business" />
                <EChartsBarChart.Bar dataKey="nonprofit" />
              </EChartsBarChart>
            </CardContent>
          </Card>

          <Card className="col-span-12 shadow-none xl:col-span-4">
            <CardContent className="flex h-full flex-col gap-5">
              <CardHeading icon={PieChartIcon} title="Where the work sits" />
              {phaseSlices.length === 0 ? (
                <LiniqoEmpty {...liniqo.funnel} className="py-4">No returns are on the books yet.</LiniqoEmpty>
              ) : (
                <EChartsPieChart data={phaseSlices} dataKey="count" nameKey="phase" config={phaseConfig} className="mx-auto h-52 w-full">
                  <EChartsPieChart.Tooltip />
                  <EChartsPieChart.Pie innerRadius={58} cornerRadius={6} paddingAngle={3} />
                </EChartsPieChart>
              )}
              <ul className="flex flex-col gap-3">
                {phaseCounts.map((phase) => {
                  const share = live === 0 ? 0 : Math.round((phase.count / live) * 1000) / 10;
                  return (
                    <li key={phase.id} className="flex items-center gap-3 text-sm">
                      <span className={cn("h-6 w-1 rounded-sm", phaseTone(phase.id))} />
                      <span className="min-w-0 flex-1 truncate">{phase.label}</span>
                      <span className="tabular-nums">{phase.count.toLocaleString("en-US")}</span>
                      <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">{share}%</span>
                    </li>
                  );
                })}
              </ul>
              <Button nativeButton={false} className="mt-auto w-fit self-end rounded-lg" render={<Link href="/returns" />}>
                Open the board
              </Button>
            </CardContent>
          </Card>

          <Card className="col-span-12 shadow-none xl:col-span-4">
            <CardContent className="flex h-full flex-col gap-5">
              <CardHeading icon={ActivityIcon} title="Still missing" />
              <ul className="flex flex-col gap-4">
                <li className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <UserRoundIcon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">Identity</span>
                    <span className="text-xs text-muted-foreground">{missingIdentity.toLocaleString("en-US")} {missingIdentity === 1 ? "return" : "returns"} not attested</span>
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <FileTextIcon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">Power of attorney</span>
                    <span className="text-xs text-muted-foreground">{missingPoa.toLocaleString("en-US")} {missingPoa === 1 ? "return" : "returns"} without one</span>
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <ListTodoIcon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">Tasks</span>
                    <span className="text-xs text-muted-foreground">{openTaskCount.toLocaleString("en-US")} still open</span>
                  </span>
                </li>
              </ul>
              <Button nativeButton={false} variant="outline" className="mt-auto w-fit" render={<Link href="/returns" />}>
                See the board
                <ArrowRightIcon />
              </Button>
            </CardContent>
          </Card>

          <Card className="col-span-12 shadow-none xl:col-span-8">
            <CardContent className="flex h-full flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <CardHeading icon={FileTextIcon} title="Open files" />
                <Button nativeButton={false} variant="outline" size="sm" render={<Link href="/returns" />}>
                  See the board
                </Button>
              </div>
              {deskFiles.length === 0 ? (
                <LiniqoEmpty {...liniqo.ledger} className="py-4">No returns are on the books yet.</LiniqoEmpty>
              ) : (
                <ul>
                  <li className="hidden grid-cols-[minmax(0,1.2fr)_8.5rem_auto] items-center gap-3 border-b px-1 pb-2 text-xs text-muted-foreground lg:grid">
                    <span>Client</span>
                    <span>Stage</span>
                    <span className="sr-only">Open</span>
                  </li>
                  {deskFiles.map((file) => (
                    <li key={file.id} className="border-b py-3 last:border-b-0">
                      <div className="grid items-center gap-3 lg:grid-cols-[minmax(0,1.2fr)_8.5rem_auto]">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="size-9">
                            {file.avatar ? <AvatarImage src={file.avatar} alt="" /> : null}
                            <AvatarFallback className="text-xs">{initials(file.name, file.email)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <Link href={`/returns/${file.profileId}/${file.id}`} className="block truncate text-sm font-medium hover:underline">
                              {file.name}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">
                              {file.taxYear} {taxpayerTypeLabel(file.taxpayerType).toLowerCase()}
                              {file.taxpayerType === "individual" ? "" : file.entity ? ` · ${file.entity}` : ""}
                              {file.email ? ` · ${file.email}` : ""}
                            </p>
                          </div>
                        </div>
                        <div>
                          <Badge variant={stageTone(file.stage)}>{stages[file.stage]}</Badge>
                        </div>
                        <Button nativeButton={false} size="sm" className="w-fit" render={<Link href={`/returns/${file.profileId}/${file.id}`} />}>
                          Open return
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <StatCard
            icon={UsersIcon}
            label="New clients"
            value={newClients}
            delta={clientDelta}
            href="/contacts"
          />
          <StatCard
            icon={ListTodoIcon}
            label="Tasks opened"
            value={currentTasks.length}
            delta={taskDelta}
            href="/tasks"
          />
          <StatCard
            icon={SendIcon}
            label="Delivered"
            value={delivered}
            href="/returns"
          />
        </div>
      </div>
    </div>
  );
}

function Delta({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={cn("inline-flex items-center font-medium", up ? "text-emerald-600" : "text-red-500")}>
      {up ? <ArrowUpIcon className="size-3.5" /> : <ArrowDownIcon className="size-3.5" />}
      {formatDelta(value)}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, delta, href }: { icon: typeof FileTextIcon; label: string; value: number; delta?: number; href: string }) {
  return (
    <Card className="col-span-12 shadow-none lg:col-span-4">
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">{value.toLocaleString("en-US")}</span>
            {delta !== undefined ? <Delta value={delta} /> : null}
          </p>
          <Button nativeButton={false} variant="ghost" className="mt-1 w-fit px-0 text-foreground hover:bg-transparent" render={<Link href={href} />}>
            See the list
            <ArrowRightIcon />
          </Button>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}


