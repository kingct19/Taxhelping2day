import "server-only";

import { packetDb } from "@/lib/docuseal";

export type LetterState =
  | { status: "unsigned" }
  | { status: "ready"; title: string; href: string }
  | { status: "waiting"; title: string };

type TemplateRow = {
  id: string;
  name: string;
  docuseal_template_id: number | null;
  kind: string | null;
};

type PacketRow = {
  template_id: number | null;
  template_ref: string | null;
  status: string;
  sign_url: string | null;
  sent_at?: string;
};

function isEngagement(template: TemplateRow | undefined, packet: PacketRow) {
  if (template?.kind === "engagement") return true;
  const envTemplate = Number(process.env.DOCUSEAL_ENGAGEMENT_TEMPLATE_ID);
  return envTemplate > 0 && packet.template_id === envTemplate && !packet.template_ref;
}

function signHref(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (url.hostname !== "docuseal.com" && !url.hostname.endsWith(".docuseal.com")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function engagementLetter(returnIds: string[]): Promise<LetterState> {
  if (returnIds.length === 0) return { status: "unsigned" };
  const db = packetDb();
  if (!db) return { status: "unsigned" };
  const [packetsResult, templatesResult] = await Promise.all([
    db.from("signing_packets").select("template_id,template_ref,status,sign_url,sent_at").in("return_id", returnIds),
    db.from("signing_templates").select("id,name,docuseal_template_id,kind"),
  ]);
  if (packetsResult.error) throw packetsResult.error;
  if (templatesResult.error) throw templatesResult.error;
  const templates = new Map((templatesResult.data as TemplateRow[] | null ?? []).map((template) => [template.id, template]));
  const packets = ((packetsResult.data ?? []) as PacketRow[]).filter((packet) => isEngagement(packet.template_ref ? templates.get(packet.template_ref) : undefined, packet));
  const pending = packets.filter((packet) => packet.status !== "completed");
  const current = pending[pending.length - 1] ?? packets[packets.length - 1];
  if (!current) return { status: "unsigned" };
  const template = current.template_ref ? templates.get(current.template_ref) : undefined;
  const title = template?.name || "Engagement letter";
  if (current.status === "completed") return { status: "waiting", title };
  const href = signHref(current.sign_url);
  if (!href) return { status: "waiting", title };
  return { status: "ready", title, href };
}
