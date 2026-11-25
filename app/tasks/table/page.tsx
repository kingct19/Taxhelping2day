import { TasksTable } from "@/components/tasks/tasks-table";
import { TasksViewSwitcher } from "@/components/tasks/view-switcher";
import { requireProfile } from "@/lib/auth";
import { loadDeskReturns } from "@/lib/desk-returns";
import { getStore } from "@/lib/store";
import { isActiveStaff } from "@/lib/teammates";

export const dynamic = "force-dynamic";

export default async function TasksTablePage({ searchParams }: { searchParams: Promise<{ conflict?: string }> }) {
  const staff = await requireProfile("staff");
  const { conflict } = await searchParams;
  const [rows, profiles] = await Promise.all([loadDeskReturns(), getStore().listProfiles()]);
  const teammates = profiles
    .filter((person) => isActiveStaff(person))
    .map((person) => ({ id: person.id, name: person.name || person.email || "Teammate" }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
        <h1 className="text-base font-semibold">Tasks</h1>
        <div className="ml-auto flex items-center gap-2">
          <TasksViewSwitcher />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex flex-col gap-4 p-4">
          {conflict ? (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              This return changed before you saved. Open it and apply the change again.
            </p>
          ) : null}
          <TasksTable rows={rows} teammates={teammates} viewerId={staff.id} />
        </div>
      </div>
    </div>
  );
}
