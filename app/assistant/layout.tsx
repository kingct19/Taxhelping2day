import { DeskShell } from "@/components/desk-shell";

export default function AssistantLayout({ children }: { children: React.ReactNode }) {
  return <DeskShell side="staff">{children}</DeskShell>;
}
