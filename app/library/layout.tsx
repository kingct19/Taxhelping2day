import { DeskFrame } from "@/components/desk-frame";

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return <DeskFrame side="staff">{children}</DeskFrame>;
}
