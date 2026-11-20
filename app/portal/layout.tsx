import { DeskShell } from "@/components/desk-shell";
import { requireProfile } from "@/lib/auth";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await requireProfile("client");
  return (
    <DeskShell side="client">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-6 overflow-auto px-4 py-6 pb-8 md:py-8">{children}</div>
    </DeskShell>
  );
}
