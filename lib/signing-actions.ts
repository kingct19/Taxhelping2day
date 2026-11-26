"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { builderConfigured, templateFieldNames, templateRole, type RemoteTemplate } from "@/lib/docuseal-builder";
import { packetDb, signingApi, signingConfigured } from "@/lib/docuseal";
import { intakeBlocker } from "@/lib/engagement";
import { engagementLetterTitle } from "@/lib/engagement-letter";
import { taxpayerTypeLabel } from "@/lib/types";
import { letterBeforeIntake } from "@/lib/practice";
import { requestThreads } from "@/lib/request-thread";
import { prefillValues } from "@/lib/smartdoc-prefill";
import { getStore } from "@/lib/store";

const uuidPattern = /^[0-9a-f-]{36}$/i;

type CreatedSigner = { submission_id?: number; slug?: string; embed_src?: string };

function signLink(signer: CreatedSigner | undefined) {
  const embed = signer?.embed_src;
  if (typeof embed === "string") {
    try {
      const url = new URL(embed);
      if (url.protocol === "https:" && (url.hostname === "docuseal.com" || url.hostname.endsWith(".docuseal.com"))) {
        return url.toString();
      }
    } catch {
      return null;
    }
  }
  const slug = signer?.slug;
  if (typeof slug === "string" && /^[A-Za-z0-9_-]{6,}$/.test(slug)) return `https://docuseal.com/s/${slug}`;
  return null;
}

function revalidateSigning(profileId: string, returnId: string, templateRef?: string) {
  revalidatePath("/smartdocs");
  revalidatePath("/portal");
  revalidatePath("/portal/engagement");
  revalidatePath(`/contacts/${profileId}`);
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
      message: {
        subject: engagementLetterTitle({
          name: client.name,
          year: item.taxYear,
          type: taxpayerTypeLabel(item.taxpayerType).toLowerCase(),
          entity: item.entity,
        }),
      },
      submitters: [{
        role: process.env.DOCUSEAL_SIGNER_ROLE,
        name: client.name,
        email: client.email,
        external_id: packet.id,
        values: { "Taxpayer name": item.entity, "Tax year": String(item.taxYear) },
      }],
    });
    const signer = (signers as CreatedSigner[])[0];
    const id = signer?.submission_id;
    if (!Number.isSafeInteger(id)) throw new Error("Unconfirmed submission.");
    const link = signLink(signer);
    const update = await db.from("signing_packets").update({
      submission_id: id,
      status: "pending",
      ...(link ? { sign_url: link } : {}),
    }).eq("id", packet.id).eq("status", "creating");
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

type SendResult = { error: string | null };

function sendFailure(error: unknown) {
  return error instanceof Error && error.message ? error.message : "Could not send the document.";
}

async function deliverSmartdoc(templateRef: string, profileId: string, returnId: string): Promise<SendResult> {
  await requireProfile("staff");
  const db = packetDb();
  if (!db || !process.env.DOCUSEAL_API_KEY) return { error: "Configure DocuSeal before sending." };
  if (!uuidPattern.test(templateRef)) return { error: "Document not found." };
  const templateResult = await db.from("signing_templates").select("id,docuseal_template_id,signer_role,archived_at,kind").eq("id", templateRef).maybeSingle();
  if (templateResult.error) throw templateResult.error;
  const template = templateResult.data;
  if (!template?.docuseal_template_id) return { error: "Save the document in the builder before sending it." };
  if (template.archived_at) return { error: "Restore the document before sending it." };
  const store = getStore();
  const [client, returns] = await Promise.all([store.getProfile(profileId), store.listReturns(profileId)]);
  const item = returns.find((row) => row.id === returnId);
  if (!item || client?.role !== "client") return { error: "Choose a client and a return." };
  if (template.kind === "engagement" && !letterBeforeIntake()) {
    const [team, catalog] = await Promise.all([store.listTeamReturns(), store.getFilingCatalog()]);
    const workflow = team.find((row) => row.id === returnId && row.profileId === profileId);
    if (!workflow || workflow.stage === "lead" || workflow.stage === "onboarding") {
      return { error: "Finish the document review before sending the engagement letter." };
    }
    if (workflow.stage === "documents") {
      const messages = await store.listMessages(profileId);
      const threads = requestThreads(messages.filter((row) => row.returnId === returnId));
      const intake = intakeBlocker(workflow.filingTypeId || workflow.taxpayerType, threads, workflow.desk, "sending the engagement letter", catalog);
      if (intake) return { error: intake };
    }
  }
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
    const letterTitle = template.kind === "engagement"
      ? engagementLetterTitle({
          name: client.name,
          year: item.taxYear,
          type: taxpayerTypeLabel(item.taxpayerType).toLowerCase(),
          entity: item.entity,
        })
      : null;
    const signers = await signingApi("/submissions", {
      template_id: template.docuseal_template_id,
      send_email: true,
      ...(letterTitle ? { message: { subject: letterTitle } } : {}),
      submitters: [{
        role,
        name: client.name,
        email: client.email,
        external_id: packet.id,
        ...(Object.keys(values).length ? { values } : {}),
      }],
    });
    const signer = (signers as CreatedSigner[])[0];
    const id = signer?.submission_id;
    if (!Number.isSafeInteger(id)) throw new Error("Unconfirmed submission.");
    const link = signLink(signer);
    const update = await db.from("signing_packets").update({
      submission_id: id,
      status: "pending",
      ...(link ? { sign_url: link } : {}),
    }).eq("id", packet.id).eq("status", "creating");
    if (update.error) throw update.error;
  } catch {
    const result = await db.from("signing_packets").update({ status: "Verify in DocuSeal" }).eq("id", packet.id).eq("status", "creating");
    if (result.error) throw result.error;
  }
  revalidateSigning(profileId, returnId, template.id);
  return { error: null };
}

export async function sendSmartdoc(templateRef: string, form: FormData): Promise<SendResult> {
  const profileId = String(form.get("profileId") ?? "");
  const returnId = String(form.get("returnId") ?? "");
  try {
    return await deliverSmartdoc(templateRef, profileId, returnId);
  } catch (error) {
    return { error: sendFailure(error) };
  }
}

export async function sendSmartdocToReturn(profileId: string, returnId: string, form: FormData): Promise<SendResult> {
  const templateRef = String(form.get("template") ?? "");
  try {
    return await deliverSmartdoc(templateRef, profileId, returnId);
  } catch (error) {
    return { error: sendFailure(error) };
  }
}

export async function setEngagementTemplate(templateRef: string) {
  await requireProfile("staff");
  const db = packetDb();
  if (!db || !uuidPattern.test(templateRef)) throw new Error("Document not found.");
  const templateResult = await db.from("signing_templates").select("id,docuseal_template_id,archived_at").eq("id", templateRef).maybeSingle();
  if (templateResult.error) throw templateResult.error;
  const template = templateResult.data;
  if (!template?.docuseal_template_id) throw new Error("Save the document in the builder before using it as the engagement letter.");
  if (template.archived_at) throw new Error("Restore the document before using it as the engagement letter.");
  const now = new Date().toISOString();
  const clear = await db.from("signing_templates").update({ kind: null, updated_at: now }).eq("kind", "engagement");
  if (clear.error) throw clear.error;
  const marked = await db.from("signing_templates").update({ kind: "engagement", updated_at: now }).eq("id", templateRef);
  if (marked.error) throw marked.error;
  revalidatePath("/smartdocs");
  revalidatePath("/contacts");
}

export async function prepareEngagementLetter(profileId: string, formData: FormData): Promise<SendResult> {
  try {
    await requireProfile("staff");
    const returnId = String(formData.get("returnId") ?? "");
    const templateRef = String(formData.get("template") ?? "");
    if (!uuidPattern.test(templateRef)) return { error: "Choose the engagement letter in Smartdocs." };
    const db = packetDb();
    if (!db) return { error: "Configure DocuSeal before sending." };
    const existing = await db.from("signing_packets").select("status").eq("return_id", returnId).eq("template_ref", templateRef);
    if (existing.error) throw existing.error;
    const open = ((existing.data ?? []) as { status: string }[]).some((packet) => packet.status !== "completed");
    if (!open) {
      await setEngagementTemplate(templateRef);
      const sent = await deliverSmartdoc(templateRef, profileId, returnId);
      if (sent.error) return sent;
    }
    revalidatePath(`/contacts/${profileId}`);
    revalidatePath("/portal");
    revalidatePath("/portal/engagement");
    return { error: null };
  } catch (error) {
    return { error: sendFailure(error) };
  }
}
