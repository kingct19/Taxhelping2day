import { SettingsNav } from "@/components/settings/settings-nav";
import { DeskFrame } from "@/components/desk-frame";
import { requireProfile } from "@/lib/auth";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireProfile("staff");

  return (
    <DeskFrame side="staff">
      <div className="flex h-full min-h-0">
        <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
          <div className="flex h-14 shrink-0 items-center border-b px-4">
            <h1 className="text-base font-semibold">Settings</h1>
          </div>
          <SettingsNav />
        </aside>
        <div className="min-h-0 min-w-0 flex-1">{children}</div>
      </div>
    </DeskFrame>
  );
}
