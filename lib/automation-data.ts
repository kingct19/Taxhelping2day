import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import {
  cleanTagName,
  defaultAutomations,
  isAutomationEvent,
  isConditionMode,
  isTriggerKind,
  ruleUsesTag,
  type Automation,
  type AutomationFire,
  type FirmTag,
  type ReturnTag,
} from "@/lib/automations";
import { isStage } from "@/lib/return-workflow";

export type AutomationTables = {
  tags: FirmTag[];
  returnTags: ReturnTag[];
  automations: Automation[];
  automationFires: AutomationFire[];
};

function copyTag(tag: FirmTag): FirmTag {
  return { ...tag };
}

function copyRule(rule: Automation): Automation {
  return { ...rule };
}

export function emptyAutomationTables(): AutomationTables {
  return { tags: [], returnTags: [], automations: defaultAutomations(), automationFires: [] };
}

export function readAutomationTables(parsed: Partial<AutomationTables> | undefined): AutomationTables {
  return {
    tags: parsed?.tags ?? [],
    returnTags: parsed?.returnTags ?? [],
    automations: parsed?.automations ?? defaultAutomations(),
    automationFires: parsed?.automationFires ?? [],
  };
}

function sameName(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function localListTags(db: AutomationTables): FirmTag[] {
  return [...db.tags].sort((a, b) => a.name.localeCompare(b.name)).map(copyTag);
}

export function localSaveTag(db: AutomationTables, name: string, id?: string): { tag: FirmTag } | { error: string } {
  const cleaned = cleanTagName(name);
  if (!cleaned) return { error: "Use a tag name of 40 characters or fewer." };
  const taken = db.tags.find((tag) => sameName(tag.name, cleaned) && tag.id !== id);
  if (taken) return { error: "A tag with that name already exists." };
  if (id) {
    const current = db.tags.find((tag) => tag.id === id);
    if (!current) return { error: "That tag was deleted." };
    current.name = cleaned;
    return { tag: copyTag(current) };
  }
  const tag: FirmTag = { id: randomUUID(), name: cleaned, createdAt: new Date().toISOString() };
  db.tags.push(tag);
  return { tag: copyTag(tag) };
}

export function localEnsureTag(db: AutomationTables, name: string): FirmTag | null {
  const cleaned = cleanTagName(name);
  if (!cleaned) return null;
  const existing = db.tags.find((tag) => sameName(tag.name, cleaned));
  if (existing) return copyTag(existing);
  const saved = localSaveTag(db, cleaned);
  return "tag" in saved ? saved.tag : null;
}

export function localDeleteTag(db: AutomationTables, id: string): { ok: true } | { ok: false; error: string } {
  const tag = db.tags.find((item) => item.id === id);
  if (!tag) return { ok: false, error: "That tag was deleted." };
  const used = db.automations.filter((rule) => ruleUsesTag(rule, id));
  if (used.length > 0) {
    const extra = used.length > 1 ? ` and ${used.length - 1} more` : "";
    return { ok: false, error: `${tag.name} is used by ${used[0].name}${extra}. Remove it from that rule first.` };
  }
  db.tags = db.tags.filter((item) => item.id !== id);
  db.returnTags = db.returnTags.filter((item) => item.tagId !== id);
  return { ok: true };
}

export function localListReturnTags(db: AutomationTables): ReturnTag[] {
  return db.returnTags.map((item) => ({ ...item }));
}

export function localAddReturnTag(db: AutomationTables, returnId: string, tagId: string): { created: boolean; createdAt: string } | { error: string } {
  if (!db.tags.some((tag) => tag.id === tagId)) return { error: "Choose a tag from the list." };
  const existing = db.returnTags.find((item) => item.returnId === returnId && item.tagId === tagId);
  if (existing) return { created: false, createdAt: existing.createdAt };
  const createdAt = new Date().toISOString();
  db.returnTags.push({ returnId, tagId, createdAt });
  return { created: true, createdAt };
}

export function localRemoveReturnTag(db: AutomationTables, returnId: string, tagId: string): boolean {
  const before = db.returnTags.length;
  db.returnTags = db.returnTags.filter((item) => item.returnId !== returnId || item.tagId !== tagId);
  return db.returnTags.length !== before;
}

export function localListAutomations(db: AutomationTables): Automation[] {
  return [...db.automations].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)).map(copyRule);
}

export function localSaveAutomation(db: AutomationTables, rule: Automation) {
  const index = db.automations.findIndex((item) => item.id === rule.id);
  if (index >= 0) db.automations[index] = copyRule(rule);
  else db.automations.push(copyRule(rule));
}

export function localDeleteAutomation(db: AutomationTables, id: string) {
  db.automations = db.automations.filter((rule) => rule.id !== id);
  db.automationFires = db.automationFires.filter((fire) => fire.automationId !== id);
}

export function localSetAutomationEnabled(db: AutomationTables, id: string, enabled: boolean) {
  const rule = db.automations.find((item) => item.id === id);
  if (rule) rule.enabled = enabled;
}

export function localAutomationFired(db: AutomationTables, automationId: string, returnId: string, triggerKey: string): boolean {
  return db.automationFires.some((fire) => fire.automationId === automationId && fire.returnId === returnId && fire.triggerKey === triggerKey);
}

export function localRecordFire(db: AutomationTables, automationId: string, returnId: string, triggerKey: string) {
  if (localAutomationFired(db, automationId, returnId, triggerKey)) return;
  db.automationFires.push({ automationId, returnId, triggerKey, firedAt: new Date().toISOString() });
}

type TagRow = { id: string; name: string; created_at: string };
type ReturnTagRow = { return_id: string; tag_id: string; created_at: string };
type RuleRow = {
  id: string;
  name: string;
  enabled: boolean;
  trigger_kind: string;
  event: string | null;
  stage: string | null;
  after_days: number | null;
  tag_id: string | null;
  condition_tag_id: string | null;
  condition_mode: string | null;
  move_to_stage: string | null;
  email_subject: string | null;
  email_body: string | null;
  add_tag_id: string | null;
  remove_tag_id: string | null;
  position: number;
};

function tagFromRow(row: TagRow): FirmTag {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

function ruleFromRow(row: RuleRow): Automation | null {
  if (!isTriggerKind(row.trigger_kind)) return null;
  const stage = row.stage && isStage(row.stage) ? row.stage : null;
  const moveToStage = row.move_to_stage && isStage(row.move_to_stage) ? row.move_to_stage : null;
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    triggerKind: row.trigger_kind,
    event: row.event && isAutomationEvent(row.event) ? row.event : null,
    stage,
    afterDays: row.after_days,
    tagId: row.tag_id,
    conditionTagId: row.condition_tag_id,
    conditionMode: row.condition_mode && isConditionMode(row.condition_mode) ? row.condition_mode : null,
    moveToStage,
    emailSubject: row.email_subject,
    emailBody: row.email_body,
    addTagId: row.add_tag_id,
    removeTagId: row.remove_tag_id,
    position: row.position,
  };
}

function ruleToRow(rule: Automation): RuleRow {
  return {
    id: rule.id,
    name: rule.name,
    enabled: rule.enabled,
    trigger_kind: rule.triggerKind,
    event: rule.event,
    stage: rule.stage,
    after_days: rule.afterDays,
    tag_id: rule.tagId,
    condition_tag_id: rule.conditionTagId,
    condition_mode: rule.conditionMode,
    move_to_stage: rule.moveToStage,
    email_subject: rule.emailSubject,
    email_body: rule.emailBody,
    add_tag_id: rule.addTagId,
    remove_tag_id: rule.removeTagId,
    position: rule.position,
  };
}

function throwIf(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function remoteListTags(client: SupabaseClient): Promise<FirmTag[]> {
  const { data, error } = await client.from("tags").select("id, name, created_at").order("name");
  throwIf(error);
  return (data as TagRow[]).map(tagFromRow);
}

export async function remoteSaveTag(client: SupabaseClient, name: string, id?: string): Promise<{ tag: FirmTag } | { error: string }> {
  const cleaned = cleanTagName(name);
  if (!cleaned) return { error: "Use a tag name of 40 characters or fewer." };
  const existing = await remoteListTags(client);
  if (existing.some((tag) => sameName(tag.name, cleaned) && tag.id !== id)) return { error: "A tag with that name already exists." };
  if (id) {
    const { data, error } = await client.from("tags").update({ name: cleaned }).eq("id", id).select("id, name, created_at").maybeSingle();
    throwIf(error);
    if (!data) return { error: "That tag was deleted." };
    return { tag: tagFromRow(data as TagRow) };
  }
  const { data, error } = await client.from("tags").insert({ name: cleaned }).select("id, name, created_at").single();
  if (error?.code === "23505") return { error: "A tag with that name already exists." };
  throwIf(error);
  return { tag: tagFromRow(data as TagRow) };
}

export async function remoteEnsureTag(client: SupabaseClient, name: string): Promise<FirmTag | null> {
  const cleaned = cleanTagName(name);
  if (!cleaned) return null;
  const existing = await remoteListTags(client);
  const found = existing.find((tag) => sameName(tag.name, cleaned));
  if (found) return found;
  const saved = await remoteSaveTag(client, cleaned);
  return "tag" in saved ? saved.tag : null;
}

export async function remoteDeleteTag(client: SupabaseClient, id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const tags = await remoteListTags(client);
  const tag = tags.find((item) => item.id === id);
  if (!tag) return { ok: false, error: "That tag was deleted." };
  const { data, error } = await client
    .from("automations")
    .select("name")
    .or(`tag_id.eq.${id},condition_tag_id.eq.${id},add_tag_id.eq.${id},remove_tag_id.eq.${id}`);
  throwIf(error);
  const used = (data as { name: string }[] | null) ?? [];
  if (used.length > 0) {
    const extra = used.length > 1 ? ` and ${used.length - 1} more` : "";
    return { ok: false, error: `${tag.name} is used by ${used[0].name}${extra}. Remove it from that rule first.` };
  }
  const removed = await client.from("tags").delete().eq("id", id);
  if (removed.error?.code === "23503") return { ok: false, error: `${tag.name} is used by an automation. Remove it from that rule first.` };
  throwIf(removed.error);
  return { ok: true };
}

export async function remoteListReturnTags(client: SupabaseClient): Promise<ReturnTag[]> {
  const rows: ReturnTag[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await client.from("return_tags").select("return_id, tag_id, created_at").range(start, start + 499);
    throwIf(error);
    const page = (data as ReturnTagRow[]).map((row) => ({ returnId: row.return_id, tagId: row.tag_id, createdAt: row.created_at }));
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}

export async function remoteAddReturnTag(client: SupabaseClient, returnId: string, tagId: string): Promise<{ created: boolean; createdAt: string } | { error: string }> {
  const tags = await remoteListTags(client);
  if (!tags.some((tag) => tag.id === tagId)) return { error: "Choose a tag from the list." };
  const existing = await client.from("return_tags").select("created_at").eq("return_id", returnId).eq("tag_id", tagId).maybeSingle();
  throwIf(existing.error);
  if (existing.data) return { created: false, createdAt: (existing.data as { created_at: string }).created_at };
  const createdAt = new Date().toISOString();
  const inserted = await client.from("return_tags").insert({ return_id: returnId, tag_id: tagId, created_at: createdAt });
  if (inserted.error?.code === "23505") return { created: false, createdAt };
  throwIf(inserted.error);
  return { created: true, createdAt };
}

export async function remoteRemoveReturnTag(client: SupabaseClient, returnId: string, tagId: string): Promise<boolean> {
  const { data, error } = await client.from("return_tags").delete().eq("return_id", returnId).eq("tag_id", tagId).select("tag_id");
  throwIf(error);
  return (data?.length ?? 0) > 0;
}

export async function remoteListAutomations(client: SupabaseClient): Promise<Automation[]> {
  const { data, error } = await client.from("automations").select("*").order("position");
  throwIf(error);
  return (data as RuleRow[]).flatMap((row) => {
    const rule = ruleFromRow(row);
    return rule ? [rule] : [];
  });
}

export async function remoteSaveAutomation(client: SupabaseClient, rule: Automation) {
  const { error } = await client.from("automations").upsert(ruleToRow(rule));
  throwIf(error);
}

export async function remoteDeleteAutomation(client: SupabaseClient, id: string) {
  const { error } = await client.from("automations").delete().eq("id", id);
  throwIf(error);
}

export async function remoteSetAutomationEnabled(client: SupabaseClient, id: string, enabled: boolean) {
  const { error } = await client.from("automations").update({ enabled }).eq("id", id);
  throwIf(error);
}

export async function remoteAutomationFired(client: SupabaseClient, automationId: string, returnId: string, triggerKey: string): Promise<boolean> {
  const { data, error } = await client
    .from("automation_fires")
    .select("id")
    .eq("automation_id", automationId)
    .eq("return_id", returnId)
    .eq("trigger_key", triggerKey)
    .maybeSingle();
  throwIf(error);
  return Boolean(data);
}

export async function remoteRecordFire(client: SupabaseClient, automationId: string, returnId: string, triggerKey: string) {
  const { error } = await client.from("automation_fires").insert({
    automation_id: automationId,
    return_id: returnId,
    trigger_key: triggerKey,
  });
  if (error?.code === "23505") return;
  throwIf(error);
}
