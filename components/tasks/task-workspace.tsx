"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ExternalLinkIcon, ListFilterIcon, PanelRightIcon, SearchIcon } from "lucide-react";
import { saveTaskNote, setTaskStatus } from "@/lib/actions";
import { LiniqoEmpty, liniqo } from "@/components/liniqo-empty";
import { TasksViewSwitcher } from "@/components/tasks/view-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export type TaskView = {
  id: string;
  profileId: string;
  clientName: string;
  clientEmail: string;
  title: string;
  detail: string;
  status: TaskStatus;
  note: string;
  createdAt: string;
  updatedAt: string;
};

type StatusFilter = "all" | TaskStatus;

const filters: { label: string; value: StatusFilter }[] = [
  { label: "All tasks", value: "all" },
  { label: "Open", value: "open" },
  { label: "Done", value: "done" },
];

function filterLabel(status: StatusFilter) {
  switch (status) {
    case "all":
      return "All tasks";
    case "open":
      return "Open";
    case "done":
      return "Done";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function initials(name: string) {
  const letters = name
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "?";
}

function fromNow(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (Number.isNaN(delta) || delta < minute) return "now";
  if (delta < hour) return `${Math.floor(delta / minute)}m`;
  if (delta < day) return `${Math.floor(delta / hour)}h`;
  return `${Math.floor(delta / day)}d`;
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function taskTone(status: TaskStatus) {
  switch (status) {
    case "open":
      return "info" as const;
    case "done":
      return "success" as const;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <Badge variant={taskTone(status)} className={className}>
      {status === "open" ? "Open" : "Done"}
    </Badge>
  );
}

export function TaskWorkspace({ tasks, selectedId }: { tasks: TaskView[]; selectedId: string | null }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [showThread, setShowThread] = useState(Boolean(selectedId));

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tasks
      .filter((task) => (status === "all" ? true : task.status === status))
      .filter((task) => (needle ? `${task.title} ${task.clientName} ${task.clientEmail} ${task.detail}`.toLowerCase().includes(needle) : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [query, status, tasks]);

  const task = tasks.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  function select(id: string) {
    setShowThread(true);
    router.push(`/tasks?id=${id}`);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <h1 className="text-base font-semibold">Tasks</h1>
        <div className="ml-auto flex items-center gap-2">
          <TasksViewSwitcher />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className={cn("flex min-h-0 w-full shrink-0 flex-col border-r md:w-80 lg:w-96", showThread && task && "max-md:hidden")}>
          <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
            <h2 className="text-sm font-semibold">{filterLabel(status)}</h2>
            <span className="text-xs text-muted-foreground tabular-nums">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-2 border-b p-3">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" className="h-8 pl-8" />
            </div>
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Filter tasks by status"
                            className={cn("shrink-0", status !== "all" && "border-primary text-primary")}
                          >
                            <ListFilterIcon className="size-4" />
                          </Button>
                        }
                      />
                    }
                  />
                  <TooltipContent>Filter by status</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={status} onValueChange={(value) => setStatus(value === "done" || value === "all" ? value : "open")}>
                  <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                  {filters.map((item) => (
                    <DropdownMenuRadioItem key={item.value} value={item.value}>
                      {item.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {filtered.length === 0 ? (
              <LiniqoEmpty {...liniqo.noMatch} className="px-4 py-6" artClassName="size-24">No tasks match your filters.</LiniqoEmpty>
            ) : (
              <ul className="flex flex-col gap-1 p-3">
                {filtered.map((item) => {
                  const active = item.id === task?.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => select(item.id)}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "flex w-full min-w-0 flex-col items-stretch gap-2 rounded-lg border border-transparent p-3 text-left hover:bg-muted/60",
                          active && "border-primary/30 bg-primary/5 hover:bg-primary/5",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar className="size-6">
                            <AvatarFallback className="text-[10px]">{initials(item.clientName)}</AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.clientName}</span>
                          <span className="shrink-0 text-[11px] font-normal text-muted-foreground">{fromNow(item.updatedAt)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <p className="line-clamp-1 text-xs font-normal text-muted-foreground">{item.detail}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={item.status} />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </div>

        <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", !showThread && "max-md:hidden")}>
          {task ? (
            <>
              <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Back" onClick={() => setShowThread(false)}>
                  <ArrowLeftIcon />
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-semibold">{task.title}</h2>
                    <StatusBadge status={task.status} className="max-lg:hidden" />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {task.clientName} · {task.clientEmail}
                  </p>
                </div>
                <TooltipProvider>
                  <div className="hidden items-center gap-1 md:flex">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button variant="ghost" size="icon" nativeButton={false} render={<Link href={`/inbox?id=${task.profileId}`} />} aria-label="Open conversation">
                            <ExternalLinkIcon />
                          </Button>
                        }
                      />
                      <TooltipContent>Open conversation</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button variant="ghost" size="icon" aria-label="Toggle details" onClick={() => setDetailsOpen((open) => !open)}>
                            <PanelRightIcon />
                          </Button>
                        }
                      />
                      <TooltipContent>Toggle details</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="flex flex-col gap-4 p-4">
                  <div className="flex items-center gap-3 py-1">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-xs whitespace-nowrap text-muted-foreground">Opened {when(task.createdAt)}</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <div className="flex items-end gap-2">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">{initials(task.clientName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex max-w-[80%] flex-col gap-1">
                      <div className="w-fit rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5 text-sm">
                        <p className="whitespace-pre-wrap">{task.detail}</p>
                      </div>
                      <p className="px-1 text-[11px] text-muted-foreground">{when(task.createdAt)}</p>
                    </div>
                  </div>
                  {task.note ? (
                    <div className="flex flex-row-reverse items-end gap-2">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">N</AvatarFallback>
                      </Avatar>
                      <div className="flex max-w-[80%] flex-col items-end gap-1">
                        <div className="w-fit rounded-xl border border-amber-400/40 bg-amber-50 px-3 py-2 dark:bg-amber-500/10">
                          <p className="text-xs font-medium">
                            Note <span className="text-muted-foreground">· Practice only</span>
                          </p>
                          <p className="mt-1 text-sm whitespace-pre-wrap">{task.note}</p>
                        </div>
                        <p className="px-1 text-[11px] text-muted-foreground">{when(task.updatedAt)}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
              <form action={saveTaskNote} className="p-4">
                <input type="hidden" name="taskId" value={task.id} />
                <div className="rounded-xl border focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/30">
                  <Textarea
                    key={task.id}
                    name="note"
                    rows={3}
                    defaultValue={task.note}
                    placeholder="Leave a note for the practice…"
                    className="max-h-40 min-h-16 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                  />
                  <div className="flex items-center justify-end gap-2 p-2">
                    <span className="text-[11px] text-muted-foreground">Saved on this task</span>
                    <Button type="submit" size="lg">
                      Save note
                    </Button>
                  </div>
                </div>
              </form>
            </>
          ) : (
            <LiniqoEmpty {...liniqo.checklist} className="flex-1">No tasks yet.</LiniqoEmpty>
          )}
        </div>

        {task && detailsOpen ? (
          <aside className="hidden h-full w-80 shrink-0 flex-col border-l bg-sidebar xl:flex">
            <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">{initials(task.clientName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{task.clientName}</p>
                <p className="truncate text-xs text-muted-foreground">{task.clientEmail}</p>
              </div>
            </div>
            <div className="flex flex-col gap-4 overflow-auto p-4">
              <p className="text-sm font-semibold">Properties</p>
              <form action={setTaskStatus} className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Status</span>
                <input type="hidden" name="taskId" value={task.id} />
                <select
                  name="status"
                  key={`${task.id}-${task.status}`}
                  defaultValue={task.status}
                  onChange={(event) => event.currentTarget.form?.requestSubmit()}
                  className="h-8 w-40 rounded-lg border border-input bg-transparent px-2 text-sm"
                >
                  <option value="open">Open</option>
                  <option value="done">Done</option>
                </select>
              </form>
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-xs text-muted-foreground">Task</span>
                <span className="max-w-[60%] truncate text-xs font-medium">{task.title}</span>
              </div>
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-xs text-muted-foreground">Updated</span>
                <span className="text-xs font-medium">{when(task.updatedAt)}</span>
              </div>
              <Link href={`/contacts/${task.profileId}`} className="text-sm underline">
                Open the contact
              </Link>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
