"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Columns3Icon, Table2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const views = [
  { href: "/tasks", label: "Workspace", icon: Columns3Icon },
  { href: "/tasks/table", label: "Table", icon: Table2Icon },
] as const;

export function TasksViewSwitcher({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 rounded-md bg-muted p-1">
      {views.map((view) => {
        const active = pathname === view.href;
        const Icon = view.icon;
        return (
          <Button
            key={view.href}
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href={view.href} />}
            className={cn("gap-1.5 rounded-sm px-2.5", active ? "bg-background text-foreground hover:bg-background" : "text-muted-foreground")}
          >
            <Icon className="size-4" />
            <span className={compact ? "sr-only" : "max-sm:hidden"}>{view.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
