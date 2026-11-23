import { SeasonDashboard, type DashboardFile, type DashboardTask } from "@/components/reports/season-dashboard";
import { requireProfile } from "@/lib/auth";
import { seasonFor } from "@/lib/season";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const staff = await requireProfile("staff");
  const store = getStore();
  const [profiles, tasks, returns] = await Promise.all([store.listProfiles(), store.listTasks(), store.listTeamReturns()]);
  const clients = profiles.filter((profile) => profile.role === "client");
  const files: DashboardFile[] = [];
  for (const client of clients) {
    const [documents, signatures, identity] = await Promise.all([
      store.listDocuments(client.id),
      store.listSignatures(client.id),
      store.getIdentity(client.id),
    ]);
    const season = seasonFor(client, signatures, documents);
    const owned = returns.filter((item) => item.profileId === client.id);
    for (const item of owned) {
      files.push({
        id: item.id,
        profileId: client.id,
        name: client.name,
        email: client.email,
        createdAt: client.createdAt,
        taxYear: item.taxYear,
        entity: item.entity,
        stage: item.stage,
        waitingOn: item.waitingOn,
        season,
        taxpayerType: item.taxpayerType,
        poa: signatures.some((signature) => signature.kind === "poa"),
        identity: Boolean(identity?.attested),
      });
    }
  }
  const taskRows: DashboardTask[] = tasks.map((task) => ({
    kind: task.kind,
    status: task.status,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }));

  // The dashboard snapshot is the time of this request.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  return <SeasonDashboard files={files} tasks={taskRows} now={now} name={staff.name || staff.email} />;
}
