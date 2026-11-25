"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { runTagChange } from "@/lib/automation-run";
import { automationFromDraft, type AutomationDraft } from "@/lib/automations";
import { requireProfile } from "@/lib/auth";
import { getStore } from "@/lib/store";

function refresh() {
  revalidatePath("/settings/automations");
  revalidatePath("/settings/tags");
  revalidatePath("/tasks");
  revalidatePath("/tasks/table");
  revalidatePath("/inbox");
  revalidatePath("/returns");
}

export async function saveAutomationAction(draft: AutomationDraft): Promise<{ error: string | null }> {
  await requireProfile("staff");
  const store = getStore();
  const existing = await store.listAutomations();
  const id = draft.id || randomUUID();
  const current = existing.find((rule) => rule.id === id);
  const parsed = automationFromDraft({ ...draft, position: current?.position ?? existing.reduce((max, rule) => Math.max(max, rule.position), -1) + 1 }, id);
  if (typeof parsed === "string") return { error: parsed };
  const tags = await store.listTags();
  const ids = new Set(tags.map((tag) => tag.id));
  for (const tagId of [parsed.tagId, parsed.conditionTagId, parsed.addTagId, parsed.removeTagId]) {
    if (tagId && !ids.has(tagId)) return { error: "That tag is no longer in the list." };
  }
  await store.saveAutomation(parsed);
  refresh();
  return { error: null };
}

export async function deleteAutomationAction(id: string) {
  await requireProfile("staff");
  await getStore().deleteAutomation(id);
  refresh();
}

export async function setAutomationEnabledAction(id: string, enabled: boolean) {
  await requireProfile("staff");
  await getStore().setAutomationEnabled(id, enabled);
  refresh();
}

export async function saveTagAction(name: string, id?: string): Promise<{ error: string | null }> {
  await requireProfile("staff");
  const saved = await getStore().saveTag(name, id);
  if ("error" in saved) return { error: saved.error };
  refresh();
  return { error: null };
}

export async function deleteTagAction(id: string): Promise<{ error: string | null }> {
  await requireProfile("staff");
  const result = await getStore().deleteTag(id);
  if (!result.ok) return { error: result.error };
  refresh();
  return { error: null };
}

export async function addReturnTagAction(returnId: string, tagId: string): Promise<{ error: string | null }> {
  await requireProfile("staff");
  const store = getStore();
  const item = (await store.listTeamReturns()).find((row) => row.id === returnId);
  if (!item) return { error: "Return not found." };
  const saved = await store.addReturnTag(returnId, tagId);
  if ("error" in saved) return { error: saved.error };
  if (saved.created) await runTagChange(returnId, tagId, "added", saved.createdAt);
  refresh();
  revalidatePath(`/returns/${item.profileId}/${returnId}`);
  return { error: null };
}

export async function removeReturnTagAction(returnId: string, tagId: string): Promise<{ error: string | null }> {
  await requireProfile("staff");
  const store = getStore();
  const item = (await store.listTeamReturns()).find((row) => row.id === returnId);
  if (!item) return { error: "Return not found." };
  const removed = await store.removeReturnTag(returnId, tagId);
  if (removed) await runTagChange(returnId, tagId, "removed", new Date().toISOString());
  refresh();
  revalidatePath(`/returns/${item.profileId}/${returnId}`);
  return { error: null };
}
