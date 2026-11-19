import Link from "next/link";
import {
  BadgeCheckIcon,
  BriefcaseIcon,
  Building2Icon,
  CheckCheckIcon,
  FileSignatureIcon,
  FolderOpenIcon,
  InboxIcon,
  AlarmClockIcon,
  ScaleIcon,
  SquarePenIcon,
  StarIcon,
  UserRoundIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { inboxFolderLabel, inboxHref, matchesInboxFolder, type InboxFolderId, type InboxRow } from "@/lib/inbox-view";
import { cn } from "@/lib/utils";

const fileFolders: { id: InboxFolderId; icon: LucideIcon }[] = [
  { id: "all", icon: InboxIcon },
  { id: "profile", icon: UserRoundIcon },
  { id: "letter", icon: FileSignatureIcon },
  { id: "documents", icon: FolderOpenIcon },
  { id: "ready", icon: CheckCheckIcon },
];

const attentionFolders: { id: InboxFolderId; icon: LucideIcon }[] = [
  { id: "poa", icon: ScaleIcon },
  { id: "identity", icon: BadgeCheckIcon },
];

const viewFolders: { id: InboxFolderId; icon: LucideIcon }[] = [
  { id: "starred", icon: StarIcon },
  { id: "snoozed", icon: AlarmClockIcon },
];

const typeFolders: { id: InboxFolderId; icon: LucideIcon }[] = [
  { id: "individual", icon: UsersIcon },
  { id: "business", icon: BriefcaseIcon },
  { id: "nonprofit", icon: Building2Icon },
];

function FolderLink({
  folder,
  active,
  count,
  icon: Icon,
}: {
  folder: InboxFolderId;
  active: boolean;
  count: number;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={inboxHref(folder)}
      aria-current={active ? "page" : undefined}
      className={cn(
        buttonVariants({ variant: active ? "secondary" : "ghost", size: "lg" }),
        "h-9 w-full justify-start gap-2 border-0 font-normal",
        active && "bg-accent font-medium text-accent-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <Icon className="text-muted-foreground" />
      <span className="flex-1 truncate text-left">{inboxFolderLabel(folder)}</span>
      {count > 0 ? <span className="text-xs text-muted-foreground tabular-nums">{count}</span> : null}
    </Link>
  );
}

export function InboxSidebar({ rows, active }: { rows: InboxRow[]; active: InboxFolderId }) {
  const count = (folder: InboxFolderId) => rows.filter((row) => matchesInboxFolder(row, folder)).length;

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-sidebar">
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <h1 className="text-base font-semibold">Inbox</h1>
        <Link href="/contacts" aria-label="Invite a client" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <SquarePenIcon />
        </Link>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <nav className="flex flex-col gap-0.5 p-2">
          {fileFolders.map((folder) => (
            <FolderLink key={folder.id} folder={folder.id} active={active === folder.id} count={count(folder.id)} icon={folder.icon} />
          ))}
        </nav>
        <div className="flex flex-col gap-0.5 p-2">
          <p className="px-2 py-2 text-xs font-medium text-muted-foreground">Views</p>
          {viewFolders.map((folder) => (
            <FolderLink key={folder.id} folder={folder.id} active={active === folder.id} count={count(folder.id)} icon={folder.icon} />
          ))}
        </div>
        <div className="flex flex-col gap-0.5 p-2">
          <p className="px-2 py-2 text-xs font-medium text-muted-foreground">Needs a look</p>
          {attentionFolders.map((folder) => (
            <FolderLink key={folder.id} folder={folder.id} active={active === folder.id} count={count(folder.id)} icon={folder.icon} />
          ))}
        </div>
        <div className="flex flex-col gap-0.5 p-2">
          <p className="px-2 py-2 text-xs font-medium text-muted-foreground">By taxpayer</p>
          {typeFolders.map((folder) => (
            <FolderLink key={folder.id} folder={folder.id} active={active === folder.id} count={count(folder.id)} icon={folder.icon} />
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
