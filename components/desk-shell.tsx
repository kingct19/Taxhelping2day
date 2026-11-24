"use client";

import { usePathname } from "next/navigation";
import {
  BookOpenIcon,
  ContactRoundIcon,
  FileSignatureIcon,
  FileTextIcon,
  FolderOpenIcon,
  HouseIcon,
  InboxIcon,
  LayoutDashboardIcon,
  ListTodoIcon,
  MessageSquareIcon,
  SettingsIcon,
  SparklesIcon,
  UserRoundIcon,
} from "lucide-react";
import { DeskRail, type DeskItem } from "@/components/desk-rail";
import type { DeskSearchItem } from "@/components/desk/desk-search";
import { DeskNotch, type NotchAction, type NotchDestination } from "@/components/portal-mobile-nav";

const staffItems: DeskItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/returns", label: "Returns", icon: FileTextIcon },
  { href: "/inbox", label: "Inbox", icon: InboxIcon },
  { href: "/tasks", label: "Tasks", icon: ListTodoIcon },
  { href: "/contacts", label: "Contacts", icon: ContactRoundIcon },
  { href: "/smartdocs", label: "Smartdocs", icon: FileSignatureIcon },
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
  { href: "/smartdocs", label: "Smartdocs", group: "Desk" },
  { href: "/library", label: "Library", group: "Desk" },
  { href: "/assistant", label: "Assistant", group: "Desk" },
  { href: "/settings/general", label: "General", group: "Settings" },
  { href: "/settings/teammates", label: "Teammates", group: "Settings" },
  { href: "/settings/security", label: "Security", group: "Settings" },
];

const clientItems: DeskItem[] = [
  { href: "/portal", label: "Home", icon: HouseIcon },
  { href: "/portal/documents", label: "Documents", icon: FolderOpenIcon },
  { href: "/portal/signatures", label: "Signatures", icon: FileSignatureIcon },
  { href: "/portal/messages", label: "Messages", icon: MessageSquareIcon },
  { href: "/portal/profile", label: "Profile", icon: UserRoundIcon },
];

const clientAccount: DeskItem[] = [
  { href: "/portal/profile", label: "Profile", icon: UserRoundIcon },
  { href: "/portal/settings", label: "Settings", icon: SettingsIcon },
];

const clientSearch: DeskSearchItem[] = [...clientItems, ...clientAccount].map((item) => ({ href: item.href, label: item.label, group: "Portal" }));

const portalActions: NotchAction[] = [
  { href: "/portal/documents", label: "Upload a document" },
  { href: "/portal/messages", label: "Message the firm" },
];

const staffActions: NotchAction[] = [{ href: "/contacts", label: "Invite a client" }];

function notchDestinations(items: DeskItem[]): NotchDestination[] {
  return items.map((item) => ({ href: item.href, label: item.label, icon: item.icon, badge: item.badge }));
}

export function DeskShell({ side, unread = 0, avatarUrl = null, children }: { side: "staff" | "client"; unread?: number; avatarUrl?: string | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const portal = side === "client";
  const items = side === "staff" ? staffItems : clientItems.map((item) => (item.href === "/portal/messages" && unread > 0 ? { ...item, badge: unread } : item));
  const homeHref = side === "staff" ? "/dashboard" : "/portal";
  const search = side === "staff" ? staffSearch : clientSearch;
  const mobileItems = portal ? [...items, ...clientAccount.filter((item) => item.href !== "/portal/profile")] : items;

  return (
    <div className="desk flex h-dvh overflow-hidden bg-background">
      <DeskRail items={items} homeHref={homeHref} search={search} avatarUrl={avatarUrl} className="max-md:hidden" />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div key={pathname} className="page-fade-in flex min-h-0 min-w-0 flex-1 flex-col">
          {children}
        </div>
      </div>
      <DeskNotch label={portal ? "Portal" : "Desk"} destinations={notchDestinations(mobileItems)} actions={portal ? portalActions : staffActions} search={search} avatarUrl={avatarUrl} />
    </div>
  );
}
