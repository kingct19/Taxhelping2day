import Link from "next/link";
import { LiniqoEmpty, liniqo } from "@/components/liniqo-empty";
import { NewSmartdocDialog } from "@/components/smartdocs/new-smartdoc-dialog";
import { SmartdocRowActions } from "@/components/smartdocs/smartdoc-row-actions";
import type { SmartdocRecipient } from "@/components/smartdocs/send-smartdoc-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { builderConfigured } from "@/lib/docuseal-builder";
import { packetDb } from "@/lib/docuseal";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

type TemplateRow = {
  id: string;
  name: string;
  docuseal_template_id: number | null;
  kind: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

function writtenDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function initials(name: string) {
  const letters = name
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "?";
}

export default async function SmartdocsPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  await requireProfile("staff");
  const archivedView = (await searchParams).archived === "1";
  const db = packetDb();
  const ready = builderConfigured();
  const templates: TemplateRow[] = [];
  const counts = new Map<string, { sent: number; completed: number }>();
  if (db) {
    const [templateResult, packetResult] = await Promise.all([
      db.from("signing_templates").select("id,name,docuseal_template_id,kind,archived_at,created_at,updated_at").order("updated_at", { ascending: false }),
      db.from("signing_packets").select("template_ref,status"),
    ]);
    if (templateResult.error) throw templateResult.error;
    if (packetResult.error) throw packetResult.error;
    templates.push(...((templateResult.data ?? []) as TemplateRow[]));
    for (const packet of packetResult.data ?? []) {
      if (!packet.template_ref) continue;
      const current = counts.get(packet.template_ref) ?? { sent: 0, completed: 0 };
      current.sent += 1;
      if (packet.status === "completed") current.completed += 1;
      counts.set(packet.template_ref, current);
    }
  }
  const visible = templates.filter((template) => archivedView === Boolean(template.archived_at));
  const archivedCount = templates.filter((template) => template.archived_at).length;
  const activeCount = templates.length - archivedCount;
  const store = getStore();
  const [profiles, returns] = await Promise.all([store.listProfiles(), store.listTeamReturns()]);
  const clients: SmartdocRecipient[] = profiles.filter((profile) => profile.role === "client").map((profile) => ({
    id: profile.id,
    label: profile.name || profile.email,
    returns: returns.filter((item) => item.profileId === profile.id).map((item) => ({
      id: item.id,
      label: `${item.taxYear} ${item.entity}`,
    })),
  }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b px-6 py-4">
        <div className="max-w-2xl">
          <h1 className="text-base font-semibold">Smartdocs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build a document once in DocuSeal, then send that same template to each client.
          </p>
        </div>
        <NewSmartdocDialog disabled={!ready} />
      </header>
      <div className="flex shrink-0 items-center gap-4 border-b px-6 py-3 text-sm">
        <Link href="/smartdocs" className={archivedView ? "text-muted-foreground" : "font-medium"}>My smartdocs {activeCount}</Link>
        <Link href="/smartdocs?archived=1" className={archivedView ? "font-medium" : "text-muted-foreground"}>Archived smartdocs {archivedCount}</Link>
      </div>
      {!ready ? (
        <p className="max-w-2xl px-6 py-4 text-sm text-muted-foreground">
          Sign in at the{" "}
          <a className="underline" href="https://console.docuseal.com/embedding/builder">DocuSeal form builder</a>
          {" "}and copy the admin email into DOCUSEAL_USER_EMAIL. The API key is in that same console, and the webhook secret is sent to /api/docuseal. Templates are stored in Supabase, so SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required too. Restart the dev server after saving .env.local.
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
        {visible.length === 0 ? (
          <LiniqoEmpty {...(archivedView ? liniqo.archive : liniqo.contract)}>{archivedView ? "No archived documents." : "No documents yet."}</LiniqoEmpty>
        ) : (
          <Card>
            <CardContent>
              <ul>
                <li className="hidden grid-cols-[minmax(0,1.4fr)_4.5rem_6.5rem_8rem_8rem_auto] items-center gap-3 border-b px-1 pb-2 text-xs text-muted-foreground lg:grid">
                  <span>Name</span>
                  <span>Sent</span>
                  <span>Completed</span>
                  <span>Created</span>
                  <span>Updated</span>
                  <span className="text-end">Actions</span>
                </li>
                {visible.map((template) => {
                  const count = counts.get(template.id) ?? { sent: 0, completed: 0 };
                  return (
                    <li key={template.id} className="border-b py-3 last:border-b-0">
                      <div className="grid items-center gap-3 lg:grid-cols-[minmax(0,1.4fr)_4.5rem_6.5rem_8rem_8rem_auto]">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarFallback className="text-xs">{initials(template.name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{template.name}</p>
                            {template.kind === "engagement" ? <p className="text-xs text-muted-foreground">Engagement letter</p> : null}
                          </div>
                        </div>
                        <p className="text-sm tabular-nums">{count.sent}</p>
                        <p className="text-sm tabular-nums">{count.completed}</p>
                        <p className="text-sm text-muted-foreground">{writtenDate(template.created_at)}</p>
                        <p className="text-sm text-muted-foreground">{writtenDate(template.updated_at)}</p>
                        <SmartdocRowActions
                          id={template.id}
                          name={template.name}
                          archived={Boolean(template.archived_at)}
                          saved={Boolean(template.docuseal_template_id)}
                          engagement={template.kind === "engagement"}
                          clients={clients}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
