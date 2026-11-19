"use client";

import { useMemo, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, CircleCheckIcon, InboxIcon, ScaleIcon, TimerIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { seasonLabel, seasonStages, type SeasonStage } from "@/lib/season";
import { taskTitle, taxpayerTypeLabel, taxpayerTypes, type TaskKind, type TaskStatus, type TaxpayerType } from "@/lib/types";
import { cn } from "@/lib/utils";

export type DashboardFile = {
  name: string;
  email: string;
  createdAt: string;
  stage: SeasonStage;
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

export function SeasonDashboard({ files, tasks }: { files: DashboardFile[]; tasks: DashboardTask[] }) {
  const [range, setRange] = useState<Range>("30d");
  const window = ranges.find((item) => item.id === range) ?? ranges[1];

  const stats = useMemo(() => {
    const now = Date.now();
    const days = window.days;
    const start = days === null ? 0 : now - days * 86_400_000;
    const previousStart = days === null ? 0 : start - days * 86_400_000;
    const currentFiles = files.filter((file) => inWindow(file.createdAt, start, now + 1));
    const previousFiles = days === null ? [] : files.filter((file) => inWindow(file.createdAt, previousStart, start));
    const openTasks = tasks.filter((task) => task.status === "open");
    const doneTasks = tasks.filter((task) => task.status === "done" && inWindow(task.updatedAt, start, now + 1));
    const previousDone = days === null ? [] : tasks.filter((task) => task.status === "done" && inWindow(task.updatedAt, previousStart, start));
    const ready = currentFiles.filter((file) => file.stage === "ready");
    const previousReady = previousFiles.filter((file) => file.stage === "ready");
    const signed = currentFiles.filter((file) => file.poa);
    const previousSigned = previousFiles.filter((file) => file.poa);
    return { currentFiles, previousFiles, openTasks, doneTasks, previousDone, ready, previousReady, signed, previousSigned, start, now };
  }, [files, tasks, window.days]);

  const weeks = useMemo(() => {
    const buckets = 8;
    const span = window.days ?? 56;
    const end = Date.now();
    return Array.from({ length: buckets }, (_, index) => {
      const bucketEnd = end - ((buckets - index - 1) * span * 86_400_000) / buckets;
      const bucketStart = end - ((buckets - index) * span * 86_400_000) / buckets;
      return {
        label: new Date(bucketEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        opened: files.filter((file) => inWindow(file.createdAt, bucketStart, bucketEnd)).length,
        done: tasks.filter((task) => task.status === "done" && inWindow(task.updatedAt, bucketStart, bucketEnd)).length,
      };
    });
  }, [files, tasks, window.days]);

  const maxBar = Math.max(1, ...weeks.flatMap((week) => [week.opened, week.done]));
  const cards = [
    {
      key: "files",
      label: "Client files",
      value: String(stats.currentFiles.length),
      subtitle: "Opened this period",
      delta: percentChange(stats.currentFiles.length, stats.previousFiles.length),
      positive: stats.currentFiles.length >= stats.previousFiles.length,
      icon: InboxIcon,
      iconClass: "bg-primary/10 text-primary",
    },
    {
      key: "tasks",
      label: "Open tasks",
      value: String(stats.openTasks.length),
      subtitle: "Still on the desk",
      delta: percentChange(stats.doneTasks.length, stats.previousDone.length),
      positive: stats.doneTasks.length >= stats.previousDone.length,
      icon: TimerIcon,
      iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      key: "ready",
      label: "Ready to prepare",
      value: String(stats.ready.length),
      subtitle: "Files with a complete season",
      delta: percentChange(stats.ready.length, stats.previousReady.length),
      positive: stats.ready.length >= stats.previousReady.length,
      icon: CircleCheckIcon,
      iconClass: "bg-green-500/10 text-green-600 dark:text-green-400",
    },
    {
      key: "poa",
      label: "Form 2848 signed",
      value: String(stats.signed.length),
      subtitle: "Of the files opened this period",
      delta: percentChange(stats.signed.length, stats.previousSigned.length),
      positive: stats.signed.length >= stats.previousSigned.length,
      icon: ScaleIcon,
      iconClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
        <h1 className="text-base font-semibold">Dashboard</h1>
        <label className="ml-auto">
          <span className="sr-only">Range</span>
          <select
            value={range}
            onChange={(event) => {
              const next = ranges.find((item) => item.id === event.target.value);
              if (next) setRange(next.id);
            }}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            {ranges.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex flex-col gap-4 p-4 sm:p-6 lg:gap-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.key} className="shadow-none">
                  <CardContent className="flex flex-row items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                      <h4 className="truncate text-2xl font-medium tabular-nums">{card.value}</h4>
                      <p className="flex flex-wrap items-center gap-x-1.5 text-xs">
                        <span className={cn("flex items-center gap-0.5 font-medium", card.positive ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400")}>
                          {card.delta >= 0 ? <ArrowUpIcon className="size-3.5" /> : <ArrowDownIcon className="size-3.5" />}
                          {formatDelta(card.delta)}
                        </span>
                        <span className="text-muted-foreground">{card.subtitle}</span>
                      </p>
                    </div>
                    <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", card.iconClass)}>
                      <Icon className="size-4" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 lg:gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader className="border-b">
                <div className="flex flex-col gap-1">
                  <span className="text-base font-semibold">File volume</span>
                  <p className="text-sm text-muted-foreground">Files opened against tasks marked done</p>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-6">
                  <Legend colorClass="bg-chart-1" value={weeks.reduce((sum, week) => sum + week.opened, 0)} label="Opened" />
                  <Legend colorClass="bg-chart-2" value={weeks.reduce((sum, week) => sum + week.done, 0)} label="Tasks done" />
                </div>
                <div className="flex h-72 items-end gap-2">
                  {weeks.map((week) => (
                    <div key={week.label} className="flex h-full flex-1 flex-col justify-end gap-1">
                      <div className="flex h-full items-end gap-1">
                        <span className="w-1/2 rounded-t-sm bg-chart-1" style={{ height: `${(week.opened / maxBar) * 100}%` }} />
                        <span className="w-1/2 rounded-t-sm bg-chart-2" style={{ height: `${(week.done / maxBar) * 100}%` }} />
                      </div>
                      <span className="truncate text-center text-[10px] text-muted-foreground">{week.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="border-b">
                <div className="flex flex-col gap-1">
                  <span className="text-base font-semibold">Where the files are</span>
                  <p className="text-sm text-muted-foreground">{stats.currentFiles.length} files in this period</p>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {seasonStages.map((stage) => {
                  const count = stats.currentFiles.filter((file) => file.stage === stage).length;
                  const width = stats.currentFiles.length === 0 ? 0 : Math.round((count / stats.currentFiles.length) * 100);
                  return (
                    <div key={stage} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{seasonLabel(stage)}</span>
                        <span className="tabular-nums">{count}</span>
                      </div>
                      <span className="h-2 overflow-hidden rounded-full bg-muted">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:gap-6 xl:grid-cols-3">
            <SeasonDonut files={stats.currentFiles} />
            <Card className="xl:col-span-2">
              <CardHeader className="border-b">
                <div className="flex flex-col gap-1">
                  <span className="text-base font-semibold">By taxpayer</span>
                  <p className="text-sm text-muted-foreground">Individuals, businesses, and non-profits opened in this period</p>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {taxpayerTypes.map((type, index) => {
                  const count = stats.currentFiles.filter((file) => file.taxpayerType === type).length;
                  const width = stats.currentFiles.length === 0 ? 0 : Math.round((count / stats.currentFiles.length) * 100);
                  const color = ["bg-chart-1", "bg-chart-2", "bg-primary"][index] ?? "bg-primary";
                  return (
                    <div key={type} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{taxpayerTypeLabel(type)}</span>
                        <span className="tabular-nums">{count}</span>
                      </div>
                      <span className="h-2 overflow-hidden rounded-full bg-muted">
                        <span className={cn("block h-full rounded-full", color)} style={{ width: `${width}%` }} />
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-1">
              <CardHeader className="border-b">
                <span className="text-base font-semibold">Tasks</span>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {(["invite", "kickoff", "review"] as const).map((kind) => {
                  const open = tasks.filter((task) => task.kind === kind && task.status === "open").length;
                  const done = tasks.filter((task) => task.kind === kind && task.status === "done").length;
                  return (
                    <div key={kind} className="flex items-center justify-between gap-3 text-sm">
                      <span>{taskTitle(kind)}</span>
                      <span className="flex gap-2">
                        <Badge variant="info">{open} open</Badge>
                        <Badge variant="success">{done} done</Badge>
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader className="border-b">
                <span className="text-base font-semibold">Files this period</span>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Taxpayer</TableHead>
                      <TableHead>Season</TableHead>
                      <TableHead>Form 2848</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.currentFiles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          No files opened in this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      stats.currentFiles.map((file) => (
                        <TableRow key={`${file.email}-${file.createdAt}`}>
                          <TableCell className="font-medium">{file.name || file.email}</TableCell>
                          <TableCell>{taxpayerTypeLabel(file.taxpayerType)}</TableCell>
                          <TableCell>{seasonLabel(file.stage)}</TableCell>
                          <TableCell>{file.poa ? "Signed" : "Open"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function SeasonDonut({ files }: { files: DashboardFile[] }) {
  const slices = seasonStages.map((stage) => ({
    stage,
    count: files.filter((file) => file.stage === stage).length,
  }));
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--primary)"];
  let cursor = 0;
  const gradient =
    total === 0
      ? "var(--muted)"
      : `conic-gradient(${slices
          .map((slice, index) => {
            const start = cursor;
            const share = (slice.count / total) * 360;
            cursor += share;
            return `${colors[index] ?? "var(--primary)"} ${start}deg ${cursor}deg`;
          })
          .join(", ")})`;

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-1">
          <span className="text-base font-semibold">Season outcomes</span>
          <p className="text-sm text-muted-foreground">Where the files in this period sit</p>
        </div>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <div className="relative size-36 shrink-0 rounded-full" style={{ background: gradient }}>
          <div className="absolute inset-6 rounded-full bg-card" />
        </div>
        <ul className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
          {slices.map((slice, index) => (
            <li key={slice.stage} className="flex items-center gap-2">
              <span className="size-2 shrink-0 rounded-full" style={{ background: colors[index] }} />
              <span className="min-w-0 flex-1 truncate">{seasonLabel(slice.stage)}</span>
              <span className="tabular-nums">{slice.count}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Legend({ colorClass, value, label }: { colorClass: string; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-10 w-1 rounded-sm", colorClass)} />
      <div className="flex flex-col">
        <span className="text-xl font-medium tabular-nums">{value}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
