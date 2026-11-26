import "server-only";

import { packetDb, refreshOpenPackets } from "@/lib/docuseal";
import type { LetterPhase } from "@/lib/engagement";
import { packetSigners } from "@/lib/smartdoc-prefill";
import { getStore } from "@/lib/store";
import { taxpayerTypeLabel, type TaxpayerType } from "@/lib/types";

export function engagementLetterTitle(input: { name: string; year: number; type: string; entity?: string | null }): string {
  const name = input.name.trim();
  const entity = input.entity?.trim() ?? "";
  const type = input.type.trim().toLowerCase();
  const who = name || entity;
  const title = who
    ? `Engagement letter for ${who}'s ${input.year} ${type} return`
    : `Engagement letter for the ${input.year} ${type} return`;
  if (!name || !entity || entity.toLowerCase() === name.toLowerCase()) return title;
  return `${title}, ${entity}`;
}

export type LetterState =
  | { status: "unsigned" }
  | {
      status: Exclude<LetterPhase, "unsigned">;
      title: string;
      href: string | null;
      packetId: string;
      sentAt: string | null;
      openedAt: string | null;
      signedAt: string | null;
    };

type TemplateRow = {
  id: string;
  name: string;
  docuseal_template_id: number | null;
  kind: string | null;
};

type PacketRow = {
  id: string;
  return_id: string;
  template_id: number | null;
  template_ref: string | null;
  status: string;
  sign_url: string | null;
  sent_at?: string | null;
  signer_states?: unknown;
};

function titleForReturn(
  item: { profileId: string; taxYear: number; taxpayerType: TaxpayerType; entity: string } | undefined,
  names: Map<string, string>,
): string {
  if (!item) return "Engagement letter";
  return engagementLetterTitle({
    name: names.get(item.profileId) || item.entity,
    year: item.taxYear,
    type: taxpayerTypeLabel(item.taxpayerType).toLowerCase(),
    entity: item.entity,
  });
}

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

function letterPhase(packet: PacketRow): Exclude<LetterPhase, "unsigned"> {
  const signer = packetSigners(packet.signer_states)[0];
  const status = signer?.status || packet.status;
  if (packet.status === "completed" || status === "completed" || signer?.completedAt) return "signed";
  if (packet.status === "declined" || status === "declined") return "declined";
  if (status === "opened" || signer?.openedAt) return "opened";
  return "sent";
}

export async function engagementLetter(returnIds: string[]): Promise<LetterState> {
  if (returnIds.length === 0) return { status: "unsigned" };
  await refreshOpenPackets(returnIds);
  const db = packetDb();
  if (!db) return { status: "unsigned" };
  const [packetsResult, templatesResult, returns] = await Promise.all([
    db.from("signing_packets").select("id,return_id,template_id,template_ref,status,sign_url,sent_at,signer_states").in("return_id", returnIds),
    db.from("signing_templates").select("id,name,docuseal_template_id,kind"),
    getStore().listTeamReturns(),
  ]);
  if (packetsResult.error) throw packetsResult.error;
  if (templatesResult.error) throw templatesResult.error;
  const templates = new Map((templatesResult.data as TemplateRow[] | null ?? []).map((template) => [template.id, template]));
  const packets = ((packetsResult.data ?? []) as PacketRow[]).filter((packet) => isEngagement(packet.template_ref ? templates.get(packet.template_ref) : undefined, packet));
  const open = packets.filter((packet) => letterPhase(packet) !== "signed");
  const current = open[open.length - 1] ?? packets[packets.length - 1];
  if (!current) return { status: "unsigned" };
  const filed = returns.filter((item) => returnIds.includes(item.id));
  const names = new Map<string, string>();
  for (const profileId of new Set(filed.map((item) => item.profileId))) {
    const profile = await getStore().getProfile(profileId);
    if (profile?.name) names.set(profileId, profile.name);
  }
  const signer = packetSigners(current.signer_states)[0];
  const status = letterPhase(current);
  return {
    status,
    title: titleForReturn(filed.find((item) => item.id === current.return_id), names),
    href: status === "signed" || status === "declined" ? null : signHref(current.sign_url),
    packetId: current.id,
    sentAt: signer?.sentAt || current.sent_at || null,
    openedAt: signer?.openedAt || null,
    signedAt: signer?.completedAt || null,
  };
}
