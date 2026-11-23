import { DeskShell } from "@/components/desk-shell";

export default function SmartdocsLayout({ children }: { children: React.ReactNode }) {
  return <DeskShell side="staff">{children}</DeskShell>;
}
