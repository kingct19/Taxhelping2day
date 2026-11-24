import { DeskFrame } from "@/components/desk-frame";

export default function InboxLayout({ children }: { children: React.ReactNode }) {
  return <DeskFrame side="staff">{children}</DeskFrame>;
}
