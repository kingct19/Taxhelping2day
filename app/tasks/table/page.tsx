import Link from "next/link";
import { CircleCheckIcon, InboxIcon, ListTodoIcon } from "lucide-react";
import { LiniqoEmpty, liniqo } from "@/components/liniqo-empty";
import { TasksViewSwitcher } from "@/components/tasks/view-switcher";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireProfile } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { taskTitle } from "@/lib/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TasksTablePage() {
  await requireProfile("staff");
  const store = getStore();
  const [tasks, profiles] = await Promise.all([store.listTasks(), store.listProfiles()]);
  const names = new Map(profiles.map((profile) => [profile.id, profile.name || profile.email]));
  const rows = [...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const open = rows.filter((task) => task.status === "open").length;
  const done = rows.filter((task) => task.status === "done").length;
  const clients = new Set(rows.map((task) => task.profileId)).size;
  const cards = [
    { label: "Open", value: open, subtitle: "Still on the desk", icon: InboxIcon, iconClass: "bg-primary/10 text-primary" },
    { label: "Done", value: done, subtitle: "Marked complete", icon: CircleCheckIcon, iconClass: "bg-green-500/10 text-green-600 dark:text-green-400" },
    { label: "Clients", value: clients, subtitle: "With a task on the file", icon: ListTodoIcon, iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
        <h1 className="text-base font-semibold">Tasks</h1>
        <div className="ml-auto flex items-center gap-2">
          <TasksViewSwitcher />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex flex-col gap-4 p-4 sm:p-6 lg:gap-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label} className="shadow-none">
                  <CardContent className="flex flex-row items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                      <p className="text-2xl font-medium tabular-nums">{card.value}</p>
                      <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                    </div>
                    <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", card.iconClass)}>
                      <Icon className="size-4" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Task</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <LiniqoEmpty {...liniqo.taskPerson}>No tasks yet.</LiniqoEmpty>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="pl-4">
                    <Link href={`/tasks?id=${task.id}`} className="font-medium underline">
                      {taskTitle(task.kind)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/contacts/${task.profileId}`} className="underline">
                      {names.get(task.profileId) ?? "Client"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={task.status === "done" ? "success" : "info"}>{task.status === "done" ? "Done" : "Open"}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(task.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}
