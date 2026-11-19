"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  ClockIcon,
  CreditCardIcon,
  MessageCircleMoreIcon,
  MessageSquareTextIcon,
  SettingsIcon,
  ShieldIcon,
  TagIcon,
  UserCheckIcon,
  UserIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const groups: { title: string; items: { href: string; label: string; icon: LucideIcon }[] }[] = [
  {
    title: "Workspace",
    items: [
      { href: "/settings/general", label: "General", icon: SettingsIcon },
      { href: "/settings/teammates", label: "Teammates", icon: UsersIcon },
      { href: "/settings/office-hours", label: "Office hours", icon: ClockIcon },
      { href: "/settings/security", label: "Security", icon: ShieldIcon },
    ],
  },
  {
    title: "Desk",
    items: [
      { href: "/settings/assignments", label: "Assignments", icon: UserCheckIcon },
      { href: "/settings/saved-replies", label: "Saved replies", icon: MessageSquareTextIcon },
    ],
  },
  {
    title: "Channels",
    items: [{ href: "/settings/messenger", label: "Messenger", icon: MessageCircleMoreIcon }],
  },
  {
    title: "Subscription",
    items: [{ href: "/settings/billing", label: "Billing", icon: CreditCardIcon }],
  },
  {
    title: "Data",
    items: [{ href: "/settings/tags", label: "Tags", icon: TagIcon }],
  },
  {
    title: "Personal",
    items: [
      { href: "/settings/profile", label: "Profile", icon: UserIcon },
      { href: "/settings/notifications", label: "Notifications", icon: BellIcon },
    ],
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5 overflow-y-auto p-3">
      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{group.title}</p>
          {group.items.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(buttonVariants({ variant: active ? "secondary" : "ghost", size: "lg" }), "justify-start gap-2 font-normal")}
              >
                <Icon />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
