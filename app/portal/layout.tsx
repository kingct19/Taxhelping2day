import { DeskShell } from "@/components/desk-shell";
import { requireProfile } from "@/lib/auth";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await requireProfile("client");
  return (
    <DeskShell side="client">
      <div className="flex h-full w-full flex-col gap-6 overflow-auto px-4 pt-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:mx-auto md:max-w-3xl md:py-8">{children}</div>
    </DeskShell>
  );
}
