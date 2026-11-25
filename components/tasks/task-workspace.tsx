"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ChevronDownIcon, LinkIcon, XIcon } from "lucide-react";
import { toast } from "@yusufceng1z/ding-react";
import { Kanban3 } from "@/components/dashboardblocks/kanban/kanban-03";
import { TasksViewSwitcher } from "@/components/tasks/view-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { moveReturnStage } from "@/lib/actions";
import type { DeskReturn } from "@/lib/desk-returns";
import { toFilterableReturn } from "@/lib/return-filters";
import { isStage, stages, stageOrder, type WaitingOn } from "@/lib/return-workflow";
import { stageTone } from "@/lib/status-tone";
import { taxpayerTypeLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

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

function Fact({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("max-w-[60%] truncate text-xs font-medium", danger && "text-destructive")} title={value}>{value}</span>
    </div>
  );
}

function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Collapsible defaultOpen className="space-y-2">
      <CollapsibleTrigger
        render={
          <Button type="button" variant="ghost" size="sm" className="group/section h-7 w-full justify-between bg-transparent px-1">
            <span className="text-sm font-medium">{title}</span>
            <ChevronDownIcon className="size-4 transition-transform group-aria-expanded/section:rotate-180" />
          </Button>
        }
      />
      <CollapsibleContent className="space-y-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function DrawerLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-md px-1 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
      <LinkIcon className="size-3.5" />
      {children}
    </Link>
  );
}

function TaskDetails({ item, onClose }: { item: DeskReturn; onClose: () => void }) {
  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Back to the board" onClick={onClose}>
          <ArrowLeftIcon />
        </Button>
        <span className="text-sm font-medium">Details</span>
        <Button variant="ghost" size="icon" className="ml-auto hidden md:inline-flex" aria-label="Close" onClick={onClose}>
          <XIcon />
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <Avatar size="lg">
              {item.avatar ? <AvatarImage src={item.avatar} alt="" /> : null}
              <AvatarFallback className="text-xs">{initials(item.clientName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{item.clientName}</p>
              <p className="text-xs text-muted-foreground">{item.clientEmail || "No email"}</p>
            </div>
            <Badge variant={stageTone(item.stage)}>{stages[item.stage]}</Badge>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/contacts/${item.profileId}`} />}>
              View contact
            </Button>
          </div>
          <Separator />
          <div className="space-y-3">
            <Fact label="Waiting" value={waitingLabel(item.waitingOn) ?? "With the firm"} />
            <Fact label="Due" value={item.due ? dueLabel(item.due) : "No due date"} danger={item.overdue} />
            <Fact label="Preparer" value={item.ownerName} />
            {item.tags.length > 0 ? <Fact label="Tags" value={item.tags.join(", ")} /> : null}
          </div>
          <Button nativeButton={false} className="w-full" render={<Link href={`/returns/${item.profileId}/${item.id}`} />}>
            Open the return
          </Button>
          <Separator />
          <DrawerSection title={`${item.taxYear} return`}>
            <Fact label="Type" value={taxpayerTypeLabel(item.taxpayerType)} />
            <Fact label="Entity" value={item.entity || "—"} />
            <Fact label="Next step" value={item.headline} />
            {item.forwardBlock ? <p className="px-1 text-xs text-muted-foreground">{item.forwardBlock}</p> : null}
          </DrawerSection>
          <Separator />
          <DrawerSection title="Links">
            <DrawerLink href={`/contacts/${item.profileId}`}>Contact</DrawerLink>
            <DrawerLink href={`/inbox?id=${item.profileId}`}>Conversation</DrawerLink>
          </DrawerSection>
        </div>
      </ScrollArea>
    </>
  );
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

export function TaskWorkspace({
  now,
  returns,
  selectedId,
  viewerId,
}: {
  now: string;
  returns: DeskReturn[];
  selectedId: string | null;
  viewerId: string;
}) {
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
    if (!closingIdRef.current) return;
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
        ...toFilterableReturn(row),
        id: row.id,
        column: row.stage,
        avatar: row.avatar,
        due: row.due,
        tags: row.tags,
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
            viewerId={viewerId}
          />
        </div>
        <div
          className={cn(
            "hidden min-h-0 shrink-0 overflow-hidden transition-[width] duration-300 ease-out motion-reduce:transition-none md:flex md:justify-end",
            item && !closing ? "md:w-96" : "md:w-0",
          )}
          onTransitionEnd={(event) => {
            if (event.target !== event.currentTarget || event.propertyName !== "width") return;
            if (!item || closingIdRef.current !== item.id) return;
            finishClose();
          }}
        >
          {item ? (
            <aside className="flex h-full w-96 shrink-0 flex-col overflow-hidden border-l bg-sidebar">
              <TaskDetails item={item} onClose={closePanel} />
            </aside>
          ) : null}
        </div>
        {item ? (
          <aside
            data-closing={closing ? "true" : "false"}
            className="desk-drawer absolute inset-y-0 right-0 z-20 flex h-full w-full shrink-0 flex-col overflow-hidden border-l bg-sidebar shadow-xl md:hidden"
            onAnimationEnd={(event) => {
              if (event.target !== event.currentTarget || closingIdRef.current !== item.id) return;
              if (event.animationName !== "desk-drawer-slide-out") return;
              finishClose();
            }}
          >
            <div className="flex h-full w-full min-w-full flex-col">
              <TaskDetails item={item} onClose={closePanel} />
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
