import { TaskWorkspace } from "@/components/tasks/task-workspace";
import { requireProfile } from "@/lib/auth";
import { loadDeskReturns } from "@/lib/desk-returns";

export const dynamic = "force-dynamic";

function deskNow() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12)).toISOString();
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ id?: string; client?: string }> }) {
  const staff = await requireProfile("staff");
  const { id, client } = await searchParams;
  const returns = await loadDeskReturns();
  const selected = returns.find((item) => item.id === id) ?? returns.find((item) => item.profileId === client) ?? null;

  return <TaskWorkspace now={deskNow()} returns={returns} selectedId={selected?.id ?? null} viewerId={staff.id} />;
}
