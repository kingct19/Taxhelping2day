"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, XIcon } from "lucide-react";
import { toast } from "@yusufceng1z/ding-react";
import { Kanban3 } from "@/components/dashboardblocks/kanban/kanban-03";
import { TasksViewSwitcher } from "@/components/tasks/view-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { moveReturnStage } from "@/lib/actions";
import type { DeskReturn } from "@/lib/desk-returns";
import { isStage, stages, stageOrder, type WaitingOn } from "@/lib/return-workflow";
import { stageTone } from "@/lib/status-tone";

const columns = stageOrder.map((stage, index) => ({
  id: stage,
  title: stages[stage],
  color: `var(--color-chart-${(index % 5) + 1})`,
}));

function initials(name: string) {
  const letters = name
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "?";
}

function dueLabel(due: string) {
  const date = new Date(`${due}T00:00:00`);
  if (Number.isNaN(date.getTime())) return due;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function waitingLabel(waiting: WaitingOn) {
  switch (waiting) {
    case "staff":
      return "On you";
    case "client":
      return "On the client";
    case null:
      return null;
    default: {
      const exhaustive: never = waiting;
      return exhaustive;
    }
  }
}

export function TaskWorkspace({ now, returns, selectedId }: { now: string; returns: DeskReturn[]; selectedId: string | null }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [boardEpoch, setBoardEpoch] = useState(0);
  const [shownId, setShownId] = useState<string | null>(selectedId);
  const [seenSelected, setSeenSelected] = useState(selectedId);
  const [closing, setClosing] = useState(false);
  const closingIdRef = useRef<string | null>(null);
  if (selectedId !== seenSelected) {
    setSeenSelected(selectedId);
    setShownId(selectedId);
    setClosing(false);
  }
  const item = returns.find((row) => row.id === shownId) ?? null;

  useEffect(() => {
    if (closingIdRef.current && closingIdRef.current !== selectedId) closingIdRef.current = null;
  }, [selectedId]);

  const finishClose = useCallback(() => {
    closingIdRef.current = null;
    setClosing(false);
    setShownId(null);
    router.push("/tasks");
  }, [router]);

  const closePanel = useCallback(() => {
    if (!item || closingIdRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishClose();
      return;
    }
    const id = item.id;
    closingIdRef.current = id;
    setClosing(true);
    window.setTimeout(() => {
      if (closingIdRef.current === id) finishClose();
    }, 420);
  }, [finishClose, item]);

  useEffect(() => {
    if (!item || closing) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      closePanel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePanel, closing, item]);
  const tickets = useMemo(
    () =>
      returns.map((row) => ({
        id: row.id,
        column: row.stage,
        title: row.headline,
        client: row.clientName,
        assignee: row.ownerName === "Unassigned" ? null : row.ownerName,
        year: row.taxYear,
        due: row.due,
        overdue: row.overdue,
        settled: row.stage === "delivery" || row.stage === "renewal",
        waiting: row.waitingOn,
      })),
    [returns],
  );

  function move(id: string, column: string) {
    const current = returns.find((row) => row.id === id);
    if (!current || current.stage === column || !isStage(column)) return false;
    if (column === current.forward) {
      if (current.forwardBlock) {
        toast.error(current.forwardBlock);
        return false;
      }
    } else if (column === current.back) {
      if (current.backBlock) {
        toast.error(current.backBlock);
        return false;
      }
    } else {
      toast.error("Move a return one stage at a time.");
      return false;
    }
    startTransition(() => {
      void moveReturnStage(current.id, current.revision, column).then((result) => {
        if (!result.ok) {
          toast.error(result.error);
          setBoardEpoch((value) => value + 1);
        }
        router.refresh();
      });
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <h1 className="text-base font-semibold">Tasks</h1>
        <div className="ml-auto flex items-center gap-2">
          <TasksViewSwitcher />
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1">
        <div className="min-h-0 min-w-0 flex-1 overflow-auto p-4">
          <Kanban3
            key={`${boardEpoch}:${returns.map((row) => `${row.id}:${row.revision}:${row.stage}`).join("|")}`}
            columns={columns}
            itemName={{ one: "return", other: "returns" }}
            now={now}
            onMove={move}
            onOpen={(id) => {
              closingIdRef.current = null;
              setClosing(false);
              setShownId(id);
              router.push(`/tasks?id=${id}`);
            }}
            selectedId={item?.id ?? null}
            tickets={tickets}
            title="Returns"
          />
        </div>
        {item ? (
          <aside
            data-closing={closing ? "true" : "false"}
            className="desk-drawer absolute inset-y-0 right-0 z-20 flex h-full w-full shrink-0 flex-col overflow-hidden border-l bg-sidebar shadow-xl md:static md:z-auto md:h-full md:shadow-none"
            onAnimationEnd={(event) => {
              if (event.target !== event.currentTarget || closingIdRef.current !== item.id) return;
              if (event.animationName !== "desk-drawer-out" && event.animationName !== "desk-drawer-slide-out") return;
              finishClose();
            }}
          >
            <div className="flex h-full w-full min-w-full flex-col md:w-96 md:min-w-96">
            <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Back to the board" onClick={closePanel}>
                <ArrowLeftIcon />
              </Button>
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">{initials(item.clientName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.clientName}</p>
                <p className="truncate text-xs text-muted-foreground">{item.clientEmail}</p>
              </div>
              <Badge variant={stageTone(item.stage)}>{stages[item.stage]}</Badge>
              <Button variant="ghost" size="icon" className="hidden md:inline-flex" aria-label="Close" onClick={closePanel}>
                <XIcon />
              </Button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold">{item.taxYear} return</p>
                <p className="text-sm text-muted-foreground">{item.headline}</p>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                <p className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Waiting</span>
                  <span>{waitingLabel(item.waitingOn) ?? "With the firm"}</span>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Due</span>
                  <span className={item.overdue ? "text-destructive" : undefined}>{item.due ? dueLabel(item.due) : "No due date"}</span>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Preparer</span>
                  <span className="truncate">{item.ownerName}</span>
                </p>
              </div>
              {item.forwardBlock ? <p className="text-sm text-muted-foreground">{item.forwardBlock}</p> : null}
              <div className="flex flex-col gap-2">
                <Link href={`/returns/${item.profileId}/${item.id}`} className="text-sm underline">
                  Open the return
                </Link>
                <Link href={`/contacts/${item.profileId}`} className="text-sm underline">
                  Open the contact
                </Link>
                <Link href={`/inbox?id=${item.profileId}`} className="text-sm underline">
                  Open conversation
                </Link>
              </div>
            </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
