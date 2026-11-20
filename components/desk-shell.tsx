"use client";

import {
  BookOpenIcon,
  ContactRoundIcon,
  FileSignatureIcon,
  FileTextIcon,
  FolderOpenIcon,
  InboxIcon,
  LayoutDashboardIcon,
  ListTodoIcon,
  ScaleIcon,
  SettingsIcon,
  SparklesIcon,
  UserRoundIcon,
} from "lucide-react";
import { DeskRail, type DeskItem } from "@/components/desk-rail";
import type { DeskSearchItem } from "@/components/desk/desk-search";
import { DeskNotch, type NotchAction, type NotchDestination } from "@/components/portal-mobile-nav";
import { cn } from "@/lib/utils";

const staffItems: DeskItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/returns", label: "Returns", icon: FileTextIcon },
  { href: "/inbox", label: "Inbox", icon: InboxIcon },
  { href: "/tasks", label: "Tasks", icon: ListTodoIcon },
  { href: "/contacts", label: "Contacts", icon: ContactRoundIcon },
  { href: "/library", label: "Library", icon: BookOpenIcon },
  { href: "/assistant", label: "Assistant", icon: SparklesIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const staffSearch: DeskSearchItem[] = [
  { href: "/dashboard", label: "Dashboard", group: "Desk" },
  { href: "/returns", label: "Returns", group: "Desk" },
  { href: "/inbox", label: "Inbox", group: "Desk" },
  { href: "/tasks", label: "Tasks", group: "Desk" },
  { href: "/contacts", label: "Contacts", group: "Desk" },
  { href: "/library", label: "Library", group: "Desk" },
  { href: "/assistant", label: "Assistant", group: "Desk" },
  { href: "/settings/general", label: "General", group: "Settings" },
  { href: "/settings/teammates", label: "Teammates", group: "Settings" },
  { href: "/settings/security", label: "Security", group: "Settings" },
];

const clientItems: DeskItem[] = [
  { href: "/portal", label: "This season", icon: InboxIcon },
  { href: "/portal/profile", label: "Profile", icon: UserRoundIcon },
  { href: "/portal/documents", label: "Documents", icon: FolderOpenIcon },
  { href: "/portal/engagement", label: "Engagement letter", icon: FileSignatureIcon },
  { href: "/portal/poa", label: "Form 2848", icon: ScaleIcon },
];

const clientSearch: DeskSearchItem[] = clientItems.map((item) => ({ href: item.href, label: item.label, group: "Portal" }));

const portalActions: NotchAction[] = [
  { href: "/portal/documents#upload", label: "Upload a document" },
  { href: "/portal#message", label: "Message the firm" },
];

const staffActions: NotchAction[] = [{ href: "/contacts", label: "Invite a client" }];

function notchDestinations(items: DeskItem[]): NotchDestination[] {
  return items.map((item) => ({ href: item.href, label: item.label, icon: item.icon }));
}

export function DeskShell({ side, children }: { side: "staff" | "client"; children: React.ReactNode }) {
  const items = side === "staff" ? staffItems : clientItems;
  const homeHref = side === "staff" ? "/inbox" : "/portal";
  const portal = side === "client";

  const search = side === "staff" ? staffSearch : clientSearch;

  return (
    <div className={cn("flex h-dvh overflow-hidden bg-background", portal && "portal md:flex-row")}>
      <DeskRail items={items} homeHref={homeHref} search={search} inset={portal} className="max-md:hidden" />
      <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", portal && "md:ml-2")}>{children}</div>
      <DeskNotch label={portal ? "Portal" : "Desk"} destinations={notchDestinations(items)} actions={portal ? portalActions : staffActions} search={search} />
    </div>
  );
}
