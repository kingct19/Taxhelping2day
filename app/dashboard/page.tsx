import { SeasonDashboard, type DashboardFile, type DashboardTask } from "@/components/reports/season-dashboard";
import { requireProfile } from "@/lib/auth";
import { seasonFor } from "@/lib/season";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireProfile("staff");
  const store = getStore();
  const [profiles, tasks] = await Promise.all([store.listProfiles(), store.listTasks()]);
  const clients = profiles.filter((profile) => profile.role === "client");
  const files: DashboardFile[] = await Promise.all(
    clients.map(async (client) => {
      const [documents, signatures, identity] = await Promise.all([
        store.listDocuments(client.id),
        store.listSignatures(client.id),
        store.getIdentity(client.id),
      ]);
      return {
        name: client.name,
        email: client.email,
        createdAt: client.createdAt,
        stage: seasonFor(client, signatures, documents),
        taxpayerType: client.taxpayerType,
        poa: signatures.some((item) => item.kind === "poa"),
        identity: Boolean(identity?.attested),
      };
    }),
  );
  const taskRows: DashboardTask[] = tasks.map((task) => ({
    kind: task.kind,
    status: task.status,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }));

  return <SeasonDashboard files={files} tasks={taskRows} />;
}
