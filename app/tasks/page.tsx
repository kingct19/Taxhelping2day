import { TaskWorkspace, type TaskView } from "@/components/tasks/task-workspace";
import { requireProfile } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { taskDetail, taskTitle } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireProfile("staff");
  const { id } = await searchParams;
  const store = getStore();
  const [tasks, profiles] = await Promise.all([store.listTasks(), store.listProfiles()]);
  const people = new Map(profiles.map((profile) => [profile.id, profile]));
  const rows: TaskView[] = tasks.map((task) => {
    const person = people.get(task.profileId);
    return {
      id: task.id,
      profileId: task.profileId,
      clientName: person?.name || person?.email || "Client",
      clientEmail: person?.email ?? "",
      title: taskTitle(task.kind),
      detail: taskDetail(task.kind),
      status: task.status,
      note: task.note,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  });

  return <TaskWorkspace tasks={rows} selectedId={id ?? null} />;
}
