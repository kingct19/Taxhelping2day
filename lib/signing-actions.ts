"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { builderConfigured, templateFieldNames, templateRole, type RemoteTemplate } from "@/lib/docuseal-builder";
import { packetDb, signingApi, signingConfigured } from "@/lib/docuseal";
import { prefillValues } from "@/lib/smartdoc-prefill";
import { getStore } from "@/lib/store";

const uuidPattern = /^[0-9a-f-]{36}$/i;

function revalidateSigning(profileId: string, returnId: string, templateRef?: string) {
  revalidatePath("/smartdocs");
  revalidatePath("/portal/engagement");
  revalidatePath(`/returns/${profileId}/${returnId}`);
  if (templateRef) {
    revalidatePath(`/smartdocs/${templateRef}`);
    revalidatePath(`/smartdocs/${templateRef}/completions`);
  }
}

export async function sendEngagement(profileId: string, returnId: string) {
  await requireProfile("staff");
  const db = packetDb();
  if (!db || !signingConfigured()) throw new Error("Configure the approved engagement template first.");
  const store = getStore();
  const [client, returns] = await Promise.all([store.getProfile(profileId), store.listReturns(profileId)]);
  const item = returns.find((row) => row.id === returnId);
  if (!item || client?.role !== "client") throw new Error("Return unavailable.");
  const template = Number(process.env.DOCUSEAL_ENGAGEMENT_TEMPLATE_ID);
  const { data: packet, error } = await db.from("signing_packets").insert({
    return_id: returnId,
    template_id: template,
    recipient: client.email,
    sent_at: new Date().toISOString(),
  }).select("id").single();
  if (error?.code === "23505") return;
  if (error) throw error;
  try {
    const signers = await signingApi("/submissions", {
      template_id: template,
      send_email: true,
      submitters: [{
        role: process.env.DOCUSEAL_SIGNER_ROLE,
        name: client.name,
        email: client.email,
        external_id: packet.id,
        values: { "Taxpayer name": item.entity, "Tax year": String(item.taxYear) },
      }],
    });
    const id = signers[0]?.submission_id;
    if (!Number.isSafeInteger(id)) throw new Error("Unconfirmed submission.");
    const update = await db.from("signing_packets").update({ submission_id: id, status: "pending" }).eq("id", packet.id).eq("status", "creating");
    if (update.error) throw update.error;
  } catch {
    const result = await db.from("signing_packets").update({ status: "Verify in DocuSeal" }).eq("id", packet.id).eq("status", "creating");
    if (result.error) throw result.error;
  }
  revalidateSigning(profileId, returnId);
}

export async function createSmartdoc(formData: FormData) {
  await requireProfile("staff");
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 120) throw new Error("Name the document.");
  const db = packetDb();
  if (!db || !builderConfigured()) throw new Error("Configure DocuSeal before creating a document.");
  const { data, error } = await db.from("signing_templates").insert({ name }).select("id").single();
  if (error) throw error;
  revalidatePath("/smartdocs");
  redirect(`/smartdocs/${data.id}`);
}

export async function recordSavedTemplate(templateRef: string, docusealId: number): Promise<{ error?: string }> {
  await requireProfile("staff");
  const db = packetDb();
  if (!db || !builderConfigured()) return { error: "Configure DocuSeal before saving a document." };
  if (!uuidPattern.test(templateRef) || !Number.isSafeInteger(docusealId) || docusealId <= 0) {
    return { error: "DocuSeal did not return a template." };
  }
  const existing = await db.from("signing_templates").select("id,docuseal_template_id").eq("id", templateRef).maybeSingle();
  if (existing.error) return { error: "Could not store the template." };
  if (!existing.data) return { error: "Document not found." };
  let remote: RemoteTemplate;
  try {
    remote = await signingApi(`/templates/${docusealId}`);
  } catch {
    return { error: "DocuSeal did not confirm the template." };
  }
  const external = String(remote.external_id ?? "").toLowerCase();
  const owned = external === templateRef.toLowerCase() || existing.data.docuseal_template_id === docusealId;
  if (!owned) return { error: "This template does not belong to the firm." };
  if (existing.data.docuseal_template_id === docusealId) return {};
  const name = remote.name?.trim();
  const { error } = await db.from("signing_templates").update({
    docuseal_template_id: docusealId,
    signer_role: templateRole(remote, "First Party"),
    ...(name ? { name } : {}),
    updated_at: new Date().toISOString(),
  }).eq("id", templateRef);
  if (error) return { error: "Could not store the template." };
  revalidatePath("/smartdocs");
  return {};
}

export async function setSmartdocArchived(templateRef: string, archived: boolean) {
  await requireProfile("staff");
  const db = packetDb();
  if (!db || !uuidPattern.test(templateRef)) throw new Error("Document not found.");
  const { error } = await db.from("signing_templates").update({
    archived_at: archived ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", templateRef);
  if (error) throw error;
  revalidatePath("/smartdocs");
}

async function deliverSmartdoc(templateRef: string, profileId: string, returnId: string) {
  await requireProfile("staff");
  const db = packetDb();
  if (!db || !process.env.DOCUSEAL_API_KEY) throw new Error("Configure DocuSeal before sending.");
  if (!uuidPattern.test(templateRef)) throw new Error("Document not found.");
  const templateResult = await db.from("signing_templates").select("id,docuseal_template_id,signer_role,archived_at").eq("id", templateRef).maybeSingle();
  if (templateResult.error) throw templateResult.error;
  const template = templateResult.data;
  if (!template?.docuseal_template_id) throw new Error("Save the document in the builder before sending it.");
  if (template.archived_at) throw new Error("Restore the document before sending it.");
  const store = getStore();
  const [client, returns] = await Promise.all([store.getProfile(profileId), store.listReturns(profileId)]);
  const item = returns.find((row) => row.id === returnId);
  if (!item || client?.role !== "client") throw new Error("Choose a client and a return.");
  let remote: RemoteTemplate | null = null;
  try {
    remote = await signingApi(`/templates/${template.docuseal_template_id}`);
  } catch {
    remote = null;
  }
  const role = remote ? templateRole(remote, template.signer_role) : template.signer_role;
  const values = remote ? prefillValues(templateFieldNames(remote), client) : {};
  const { data: packet, error } = await db.from("signing_packets").insert({
    return_id: returnId,
    template_id: template.docuseal_template_id,
    template_ref: template.id,
    recipient: client.email,
    sent_at: new Date().toISOString(),
  }).select("id").single();
  if (error) throw error;
  try {
    const signers = await signingApi("/submissions", {
      template_id: template.docuseal_template_id,
      send_email: true,
      submitters: [{
        role,
        name: client.name,
        email: client.email,
        external_id: packet.id,
        ...(Object.keys(values).length ? { values } : {}),
      }],
    });
    const id = signers[0]?.submission_id;
    if (!Number.isSafeInteger(id)) throw new Error("Unconfirmed submission.");
    const update = await db.from("signing_packets").update({ submission_id: id, status: "pending" }).eq("id", packet.id).eq("status", "creating");
    if (update.error) throw update.error;
  } catch {
    const result = await db.from("signing_packets").update({ status: "Verify in DocuSeal" }).eq("id", packet.id).eq("status", "creating");
    if (result.error) throw result.error;
  }
  revalidateSigning(profileId, returnId, template.id);
}

export async function sendSmartdoc(templateRef: string, form: FormData) {
  const profileId = String(form.get("profileId") ?? "");
  const returnId = String(form.get("returnId") ?? "");
  await deliverSmartdoc(templateRef, profileId, returnId);
}

export async function sendSmartdocToReturn(profileId: string, returnId: string, form: FormData) {
  const templateRef = String(form.get("template") ?? "");
  await deliverSmartdoc(templateRef, profileId, returnId);
}
