"use server";

import { clientMayCancel, isStage, nextStage, sendBackTarget, stages } from "@/lib/return-workflow";
import { deriveStage, filingPlace, filingPrompt, filingStatusLabel } from "@/lib/next-action";
import { runDocumentsReady, runEfileSigned, runEnteredStage, runFilingAccepted, runInvited, runProfileComplete, runReturnCancelled } from "@/lib/automation-run";
import { advanceBlocker, sendBackBlocker } from "@/lib/engagement";
import { seedOrganizer } from "@/lib/organizer";
import { requestRoot, requestThreads } from "@/lib/request-thread";
import { preparationBlockers, reviewBlockers } from "@/lib/return-readiness";
import { preparationChecklist, reviewChecklist, type DeskIssue } from "@/lib/return-desk";
import { randomUUID } from "crypto";
import { Resend } from "resend";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { siteUrl } from "@/lib/firm";
import { getStore } from "@/lib/store";
import { isActiveStaff, isStaffRank, isStaffStatus, teammateUpdateError } from "@/lib/teammates";
import { buildSignedPdf } from "@/lib/pdf";
import { formatBytes } from "@/lib/inbox-view";
import { parseFilingCatalog, returnTaxpayerType } from "@/lib/filing-catalog";
import { documentKinds, isConversationChannel, isEfileSigner, isFilingJurisdiction, isFilingStatus, isInvoiceStatus, isLeadSource, isRequestBlock, isTaskStatus, isTaxpayerType, orderedFilingTypes, primaryFilingType, serviceLines, type ConversationChannel, type ConversationPatch, type DocumentKind, type EfileSigner, type Profile, type RequestState, type TaxpayerType } from "@/lib/types";

function isDocumentKind(value: string): value is DocumentKind {
  return documentKinds.some((item) => item === value);
}

function sameName(left: string, right: string): boolean {
  return left.trim().toLowerCase().replace(/\s+/g, " ") === right.trim().toLowerCase().replace(/\s+/g, " ");
}

async function requireActiveStaff(id: string) {
  if (!id) return;
  const person = await getStore().getProfile(id);
  if (!person || !isActiveStaff(person)) throw new Error("Choose a staff member.");
}

async function ensureAuthorizations(profileId: string, returnId: string, version: number) {
  const store = getStore();
  const [profile, existing] = await Promise.all([store.getProfile(profileId), store.listAuthorizations(returnId)]);
  const signers: EfileSigner[] = profile?.spouseName.trim() ? ["taxpayer", "spouse"] : ["taxpayer"];
  for (const signer of signers) {
    if (existing.some((item) => item.signer === signer && item.returnVersion === version)) continue;
    await store.saveAuthorization({ returnId, signer, returnVersion: version, method: null, status: "needed", signedAt: null, evidence: "" });
  }
}

async function syncRequestStage(profileId: string, returnId: string) {
  const store = getStore();
  const [messages, team] = await Promise.all([store.listMessages(profileId), store.listTeamReturns()]);
  const item = team.find((row) => row.id === returnId);
  if (!item) return;
  const next = deriveStage(item, requestThreads(messages.filter((row) => row.returnId === returnId)));
  await store.updateWorkflow(returnId, { ...item, ...next });
}

function revalidatePortal() {
  revalidatePath("/portal");
  revalidatePath("/portal/documents");
  revalidatePath("/portal/signatures");
  revalidatePath("/portal/messages");
  revalidatePath("/portal/profile");
  revalidatePath("/portal/efile");
  revalidatePath("/portal/engagement");
  revalidatePath("/portal/poa");
}

function revalidateReturn(profileId: string, returnId: string) {
  revalidatePath(`/returns/${profileId}/${returnId}`);
  revalidatePath("/returns");
  revalidatePortal();
  revalidatePath("/dashboard");
  revalidatePath("/inbox");
  revalidatePath("/tasks");
  revalidatePath("/tasks/table");
}

async function sendClerkInvite(email: string, role: "client" | "staff") {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const clerk = await clerkClient();
  await clerk.invitations.createInvitation({
    emailAddress: email,
    redirectUrl: `${protocol}://${host}/sign-up`,
    publicMetadata: { role },
    ignoreExisting: true,
  });
}

async function deliverInvite(email: string, role: "client" | "staff") {
  try {
    await sendClerkInvite(email, role);
  } catch {
    return { error: "They are on the desk. If the email did not arrive, they can sign in with an email code." };
  }
  return undefined;
}

export type ProfileSaveState = { error: string | null };

export async function saveProfile(_state: ProfileSaveState, formData: FormData): Promise<ProfileSaveState> {
  const profile = await requireProfile("client");
  const store = getStore();
  const catalog = await store.getFilingCatalog();
  const filingTypes = orderedFilingTypes(formData.getAll("taxpayerType").map((value) => String(value)), catalog.types.map((type) => type.id));
  if (filingTypes.length === 0) {
    return { error: "Choose at least one filing type. A job and a business can both be selected." };
  }
  const taxpayerType = filingTypes.some(isTaxpayerType) ? primaryFilingType(filingTypes) : profile.taxpayerType;
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim().toUpperCase();
  const zip = String(formData.get("zip") ?? "").trim();
  const spouseName = String(formData.get("spouseName") ?? "").trim();
  const taxYears = String(formData.get("taxYears") ?? "").trim();
  const rawTaxId = String(formData.get("taxId") ?? "").trim();
  const taxDigits = rawTaxId.replace(/\D/g, "");
  if (!name) return { error: "Enter your legal name." };
  if (!address) return { error: "Enter your street address." };
  if (phone && phone.replace(/\D/g, "").length < 10) return { error: "Enter a 10-digit phone number, or leave it blank." };
  if (state && !/^[A-Z]{2}$/.test(state)) return { error: "Use the two-letter state abbreviation." };
  if (zip && !/^\d{5}(-\d{4})?$/.test(zip)) return { error: "Enter a 5-digit ZIP code." };
  if (rawTaxId && taxDigits.length !== 9) {
    return { error: "Enter the 9-digit taxpayer ID, or leave it blank to keep the number on file." };
  }
  try {
    await store.updateProfile(profile.id, {
      name,
      phone,
      address,
      city,
      state,
      zip,
      taxpayerType,
      filingTypes,
      spouseName,
      taxYears,
      taxId: taxDigits || undefined,
    });
    await store.addMessage({
      profileId: profile.id,
      authorId: profile.id,
      authorRole: "client",
      body: "Profile saved.",
      kind: "event",
    });
    await openFilingTypes(profile.id, filingTypes, name);
  } catch {
    return { error: "We could not save your profile. Check the fields and try again." };
  }
  revalidatePortal();
  revalidatePath("/inbox");
  redirect("/portal");
}

export async function saveAvatar(formData: FormData): Promise<{ error: string | null }> {
  const profile = await requireProfile("client");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo." };
  const store = getStore();
  try {
    await store.saveAvatar({
      profileId: profile.id,
      contentType: file.type || "application/octet-stream",
      bytes: Buffer.from(await file.arrayBuffer()),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the photo.";
    return { error: message };
  }
  revalidatePath("/portal", "layout");
  revalidatePath("/portal/profile");
  return { error: null };
}

export async function removeAvatar(): Promise<{ error: string | null }> {
  const profile = await requireProfile("client");
  try {
    await getStore().clearAvatar(profile.id);
  } catch {
    return { error: "Could not remove the photo." };
  }
  revalidatePath("/portal", "layout");
  revalidatePath("/portal/profile");
  return { error: null };
}

export async function uploadDocument(formData: FormData) {
  const profile = await requireProfile("client");
  const kind = String(formData.get("kind") ?? "");
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim().slice(0, 240);
  if (!isDocumentKind(kind) || !(file instanceof File) || file.size === 0) {
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Choose a file up to 15 MB.");
  }
  const store = getStore();
  const requestedId = String(formData.get("returnId") ?? "");
  const returns = (await store.listTeamReturns()).filter((item) => item.profileId === profile.id && !item.archivedAt);
  const current = returns.find((item) => item.id === requestedId) ?? null;
  const document = await store.addDocument({
    profileId: profile.id,
    returnId: current?.id ?? null,
    kind,
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    bytes: Buffer.from(await file.arrayBuffer()),
  });
  if (current) {
    const root = await store.addMessage({
      profileId: profile.id,
      returnId: current.id,
      requestState: "open",
      requestBlock: "filing",
      authorId: profile.id,
      authorRole: "client",
      kind: "message",
      body: title || file.name,
    });
    await store.addMessage({
      profileId: profile.id,
      previousId: root.id,
      returnId: current.id,
      documentId: document.id,
      requestState: "responded",
      requestBlock: "filing",
      authorId: profile.id,
      authorRole: "client",
      kind: "event",
      body: `Uploaded ${file.name} for review.`,
    });
    await syncRequestStage(profile.id, current.id);
    revalidateReturn(profile.id, current.id);
  } else {
    await store.addMessage({
      profileId: profile.id,
      authorId: profile.id,
      authorRole: "client",
      documentId: document.id,
      body: `Uploaded ${file.name} for review.`,
      kind: "event",
    });
    revalidatePortal();
    revalidatePath("/inbox");
  }
}

export async function signDocument(formData: FormData) {
  const profile = await requireProfile("client");
  const kind = String(formData.get("kind") ?? "");
  const signature = String(formData.get("signature") ?? "");
  if (kind !== "poa") {
    return;
  }
  const match = signature.match(/^data:image\/png;base64,(.+)$/);
  if (!match) {
    return;
  }
  const store = getStore();
  const fresh = await store.getProfile(profile.id);
  if (!fresh?.name) {
    return;
  }
  const taxId = await store.getTaxId(profile.id);
  if (kind === "poa" && (!taxId || !fresh.address || !fresh.taxYears?.trim())) {
    return;
  }
  const headerList = await headers();
  const signedAt = new Date();
  const bytes = await buildSignedPdf({
    kind,
    profile: fresh,
    taxId,
    signaturePng: Buffer.from(match[1], "base64"),
    signedAt,
    ip: headerList.get("x-forwarded-for") ?? "local",
    userAgent: headerList.get("user-agent") ?? "unknown",
  });
  await store.addSignature({
    profileId: profile.id,
    kind,
    ip: headerList.get("x-forwarded-for") ?? "local",
    userAgent: headerList.get("user-agent") ?? "unknown",
    bytes: Buffer.from(bytes),
  });
  await store.addMessage({
    profileId: profile.id,
    authorId: profile.id,
    authorRole: "client",
    body: kind === "poa" ? "Signed Form 2848." : "Signed the engagement letter.",
    kind: "event",
  });
  revalidatePortal();
  revalidatePath("/inbox");
  redirect("/portal");
}

export async function inviteClient(formData: FormData) {
  const staff = await requireProfile("staff");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  if (!email.includes("@")) {
    return { error: "Enter an email address." };
  }
  const store = getStore();
  const client = await store.createClient({ email, name });
  await runInvited(client.id);
  await store.addMessage({
    profileId: client.id,
    authorId: staff.id,
    authorRole: "staff",
    body: "Invited to the portal.",
    kind: "event",
  });
  const delivered = await deliverInvite(email, "client");
  revalidatePath("/contacts");
  revalidatePath("/inbox");
  revalidatePath("/settings/teammates");
  return delivered;
}

export async function submitClientInvite(formData: FormData) {
  await inviteClient(formData);
}

export async function inviteTeammate(formData: FormData) {
  const actor = await requireProfile("staff");
  if (actor.staffRank !== "owner") return { error: "Only an owner can change teammates." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const rankValue = String(formData.get("staffRank") ?? "staff");
  if (!email.includes("@")) {
    return { error: "Enter an email address." };
  }
  if (!isStaffRank(rankValue)) {
    return { error: "Choose a role." };
  }
  const store = getStore();
  const teammate = await store.createStaff({ email, name, staffRank: rankValue });
  if (!teammate) {
    return { error: "That email already belongs to a client." };
  }
  const delivered = await deliverInvite(email, "staff");
  revalidatePath("/settings/teammates");
  return delivered;
}

export async function updateTeammate(formData: FormData) {
  const actor = await requireProfile("staff");
  const store = getStore();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const nextRank = String(formData.get("staffRank") ?? "");
  const nextStatus = String(formData.get("staffStatus") ?? "");
  if (!isStaffRank(nextRank) || !isStaffStatus(nextStatus)) {
    return { error: "Choose a role and a status." };
  }
  const profiles = await store.listProfiles();
  const activeOwnerIds = profiles.filter((person) => person.role === "staff" && person.staffRank === "owner" && person.staffStatus === "active").map((person) => person.id);
  const error = teammateUpdateError({
    actorId: actor.id,
    actorRank: actor.staffRank,
    targetId: id,
    nextRank,
    nextStatus,
    activeOwnerIds,
  });
  if (error) return { error };
  const saved = await store.updateTeammate(id, { name, staffRank: nextRank, staffStatus: nextStatus });
  if (!saved) return { error: "That teammate is not on this desk." };
  revalidatePath("/settings/teammates");
  revalidatePath("/settings/profile");
  revalidatePath("/inbox");
  revalidatePath("/returns");
  revalidatePath("/tasks/table");
  return { error: null };
}

export async function importClients(formData: FormData) {
  await requireProfile("staff");
  const csv = String(formData.get("csv") ?? "");
  const store = getStore();
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const [emailRaw, ...nameParts] = line.split(",");
    const email = emailRaw?.trim().toLowerCase() ?? "";
    if (!email.includes("@") || email === "email") {
      continue;
    }
    const client = await store.createClient({ email, name: nameParts.join(",").trim() });
    await sendClerkInvite(client.email, "client");
  }
  revalidatePath("/contacts");
  revalidatePath("/inbox");
}

export async function postMessage(formData: FormData) {
  const profile = await requireProfile();
  const body = String(formData.get("body") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? profile.id);
  const targetId = profile.role === "staff" ? clientId : profile.id;
  const requested = String(formData.get("kind") ?? "message");
  const kind = profile.role === "staff" && requested === "note" ? "note" : "message";
  const store = getStore();
  const attachments = [];
  if (profile.role === "client" && kind === "message") {
    const files = formData.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) throw new Error("Each file must be 15 MB or smaller.");
      const document = await store.addDocument({
        profileId: profile.id,
        kind: "other",
        filename: file.name || "attachment",
        contentType: file.type || "application/octet-stream",
        bytes: Buffer.from(await file.arrayBuffer()),
      });
      attachments.push({
        id: document.id,
        name: document.filename,
        size: formatBytes(file.size),
        type: file.type.startsWith("image/") ? "image" as const : "file" as const,
        documentId: document.id,
        url: `/files/documents/${document.id}`,
      });
    }
  }
  if (!body && attachments.length === 0) return;
  await store.addMessage({
    profileId: targetId,
    authorId: profile.id,
    authorRole: profile.role,
    body: body || "Attachment",
    kind,
    delivery: kind === "message" ? "sent" : null,
    attachments,
  });
  revalidatePath("/inbox");
  revalidatePortal();
}

export async function markPortalMessagesSeen(): Promise<{ updated: number }> {
  const profile = await requireProfile("client");
  const updated = await getStore().markStaffMessagesSeen(profile.id);
  if (updated > 0) revalidatePortal();
  return { updated };
}

export async function updateConversation(id: string, patch: ConversationPatch) {
  await requireProfile("staff");
  if (!id) return;
  const store = getStore();
  const next = patch.tags
    ? { ...patch, tags: patch.tags.map((tag) => tag.trim()).filter(Boolean) }
    : patch;
  if (next.tags) {
    for (const name of next.tags) await store.ensureTag(name);
  }
  if (next.assigneeId) await requireActiveStaff(next.assigneeId);
  await store.updateConversation(id, next);
  revalidatePath("/inbox");
}

export async function markConversationRead(id: string) {
  await requireProfile("staff");
  if (!id) return;
  await getStore().markConversationRead(id);
  revalidatePath("/inbox");
}

export async function createInboxConversation(input: { profileId: string; subject: string; channel: string; body: string }) {
  const staff = await requireProfile("staff");
  const channel: ConversationChannel = isConversationChannel(input.channel) ? input.channel : "chat";
  const store = getStore();
  const client = await store.getProfile(input.profileId);
  if (!client || client.role !== "client") return null;
  const conversation = await store.createConversation({
    profileId: client.id,
    subject: input.subject.trim() || client.name || client.email,
    channel,
    assigneeId: staff.id,
    createdByMe: true,
  });
  const body = input.body.trim();
  if (body) {
    await store.addMessage({
      profileId: client.id,
      conversationId: conversation.id,
      authorId: staff.id,
      authorRole: "staff",
      body,
      kind: "message",
      delivery: "sent",
    });
  }
  revalidatePath("/inbox");
  return client.id;
}

export async function sendConversationMessage(formData: FormData) {
  const staff = await requireProfile("staff");
  const conversationId = String(formData.get("conversationId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const kind = String(formData.get("kind") ?? "message") === "note" ? "note" : "message";
  const store = getStore();
  const conversation = await store.getConversation(conversationId);
  if (!conversation) return;
  const files = formData.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
  const attachments = [];
  for (const file of files) {
    const document = await store.addDocument({
      profileId: conversation.profileId,
      kind: "other",
      filename: file.name || "attachment",
      contentType: file.type || "application/octet-stream",
      bytes: Buffer.from(await file.arrayBuffer()),
    });
    attachments.push({
      id: document.id,
      name: document.filename,
      size: formatBytes(file.size),
      type: file.type.startsWith("image/") ? "image" as const : "file" as const,
      documentId: document.id,
      url: `/files/documents/${document.id}`,
    });
  }
  if (!body && attachments.length === 0) return;
  await store.addMessage({
    profileId: conversation.profileId,
    conversationId: conversation.id,
    authorId: staff.id,
    authorRole: "staff",
    body: body || "Attachment",
    kind,
    delivery: kind === "message" ? "sent" : null,
    attachments,
  });
  revalidatePath("/inbox");
  revalidatePath(`/contacts/${conversation.profileId}`);
}

export async function setFileFlags(formData: FormData) {
  await requireProfile("staff");
  const clientId = String(formData.get("clientId") ?? "");
  const flag = String(formData.get("flag") ?? "");
  const store = getStore();
  const profile = await store.getProfile(clientId);
  if (!profile || profile.role !== "client") {
    return;
  }
  if (flag === "star") {
    await store.setFileFlags(clientId, { starred: !profile.starred });
  } else if (flag === "snooze") {
    const active = profile.snoozedUntil !== null && new Date(profile.snoozedUntil).getTime() > Date.now();
    await store.setFileFlags(clientId, {
      snoozedUntil: active ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  revalidatePath("/inbox");
  revalidatePath("/contacts");
}

export async function saveIdentity(formData: FormData) {
  const staff = await requireProfile("staff");
  const clientId = String(formData.get("clientId") ?? "");
  const attested = String(formData.get("attested") ?? "") === "yes";
  const store = getStore();
  await store.saveIdentity({
    profileId: clientId,
    attested,
    note: String(formData.get("note") ?? "").trim(),
    attestedAt: attested ? new Date().toISOString() : null,
    attestedBy: attested ? staff.id : null,
  });
  revalidatePath("/inbox");
  revalidatePath("/tasks");
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${clientId}`);
}

export async function setTaskStatus(formData: FormData) {
  await requireProfile("staff");
  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!taskId || !isTaskStatus(status)) {
    return;
  }
  await getStore().setTaskStatus(taskId, status);
  revalidatePath("/tasks");
  revalidatePath("/tasks/table");
}

export async function saveTaskNote(formData: FormData) {
  await requireProfile("staff");
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) {
    return;
  }
  await getStore().saveTaskNote(taskId, String(formData.get("note") ?? "").trim());
  revalidatePath("/tasks");
}

async function openFilingTypes(profileId: string, filingTypes: string[], entity: string) {
  const store = getStore();
  const catalog = await store.getFilingCatalog();
  const known = new Set(catalog.types.map((type) => type.id));
  const owned = (await store.listTeamReturns()).filter((row) => row.profileId === profileId && !row.archivedAt);
  const taxYear = owned.reduce((year, row) => Math.max(year, row.taxYear), new Date().getFullYear() - 1);
  for (const filingTypeId of filingTypes) {
    if (!known.has(filingTypeId)) continue;
    if (owned.some((row) => row.taxYear === taxYear && (row.filingTypeId || row.taxpayerType) === filingTypeId)) continue;
    await store.createReturn({ profileId, taxYear, entity, taxpayerType: returnTaxpayerType(filingTypeId), filingTypeId, source: "inquiry", services: ["tax_return"] });
  }
  const fresh = (await store.listTeamReturns()).filter((row) => row.profileId === profileId && !row.archivedAt && row.taxYear === taxYear);
  for (const filingTypeId of filingTypes) {
    if (!known.has(filingTypeId)) continue;
    const current = fresh.find((row) => (row.filingTypeId || row.taxpayerType) === filingTypeId);
    if (!current) throw new Error("Could not open the return.");
    if (current.desk.intakeAnswered && current.services.includes("tax_return")) continue;
    const saved = await store.updateWorkflow(current.id, {
      ...current,
      services: current.services.includes("tax_return") ? current.services : [...current.services, "tax_return"],
      desk: { ...current.desk, intakeAnswered: true, filingNeeds: [] },
    });
    if (!saved) throw new Error("This return changed. Refresh and try again.");
    revalidatePath(`/returns/${profileId}/${current.id}`);
  }
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${profileId}`);
  revalidatePath("/returns");
  revalidatePath("/portal");
  revalidatePath("/portal/documents");
  await runProfileComplete(profileId);
}

export async function chooseFilingType(_state: { error: string | null }, data: FormData): Promise<{ error: string | null }> {
  const actor = await requireProfile();
  const store = getStore();
  const catalog = await store.getFilingCatalog();
  const filingTypes = orderedFilingTypes(data.getAll("taxpayerType").map((value) => String(value)), catalog.types.map((type) => type.id));
  const requestedId = String(data.get("returnId") ?? "");
  const team = await store.listTeamReturns();
  const requested = requestedId ? team.find((row) => row.id === requestedId) ?? null : null;
  if (requested && actor.role === "client" && requested.profileId !== actor.id) return { error: "Return not found." };
  const profileId = actor.role === "client" ? actor.id : requested?.profileId;
  if (!profileId) return { error: "Return not found." };
  const profile = await store.getProfile(profileId);
  if (!profile || profile.role !== "client") return { error: "Return not found." };
  const entity = profile.name.trim() || profile.email;
  try {
    await store.updateProfile(profile.id, {
      name: profile.name,
      phone: profile.phone,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      zip: profile.zip,
      taxpayerType: filingTypes.some(isTaxpayerType) ? primaryFilingType(filingTypes) : profile.taxpayerType,
      filingTypes,
      spouseName: profile.spouseName,
      taxYears: profile.taxYears,
    });
    await openFilingTypes(profile.id, filingTypes, entity);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not open those returns." };
  }
  return { error: null };
}

async function firmAuthorId(): Promise<string> {
  const people = await getStore().listProfiles();
  const staff = people.find((person) => person.role === "staff" && isActiveStaff(person));
  if (!staff) throw new Error("The firm is not ready to open a return yet.");
  return staff.id;
}

async function openClientReturn(profile: Profile, taxYear: number, filingTypeId: string) {
  const store = getStore();
  const freshProfile = await store.getProfile(profile.id);
  if (!freshProfile || freshProfile.role !== "client") throw new Error("Return not found.");
  const catalog = await store.getFilingCatalog();
  const type = catalog.types.find((item) => item.id === filingTypeId && !item.retired);
  if (!type) throw new Error("That filing type is not available.");
  if (!Number.isInteger(taxYear) || taxYear < 1900 || taxYear > 9999) throw new Error("Enter a four-digit tax year.");
  const owned = (await store.listTeamReturns()).filter((row) => row.profileId === freshProfile.id);
  const prior = [...owned].sort((left, right) => right.taxYear - left.taxYear).find((row) => (row.filingTypeId || row.taxpayerType) === filingTypeId && !row.archivedAt);
  const entity = (prior?.entity || freshProfile.name.trim() || freshProfile.email).slice(0, 150);
  if (!entity) throw new Error("Add your name before opening a return.");
  const same = owned.find((row) => row.taxYear === taxYear && (row.filingTypeId || row.taxpayerType) === filingTypeId && row.entity.toLowerCase() === entity.toLowerCase());
  if (same && (same.archivedAt || same.stage === "canceled")) {
    if (same.stage !== "canceled" && !clientMayCancel(same.stage)) throw new Error("That year is already on file.");
    const stage = same.stage === "canceled" ? (same.desk.intakeAnswered ? "documents" : "lead") : same.stage;
    const restored = await store.updateWorkflow(same.id, { ...same, archivedAt: null, stage, waitingOn: null, nextAction: "" });
    if (!restored) throw new Error("This return changed. Refresh and try again.");
  } else if (!same) {
    await store.createReturn({
      profileId: freshProfile.id,
      taxYear,
      entity,
      taxpayerType: returnTaxpayerType(filingTypeId),
      filingTypeId,
      source: prior ? "returning" : "inquiry",
      services: prior?.services.includes("tax_return") ? prior.services : ["tax_return"],
    });
  }
  const current = (await store.listTeamReturns()).find((row) => row.profileId === freshProfile.id && !row.archivedAt && row.taxYear === taxYear && (row.filingTypeId || row.taxpayerType) === filingTypeId && row.entity.toLowerCase() === entity.toLowerCase());
  if (!current) throw new Error("Could not open the return.");
  const filingTypes = orderedFilingTypes([...(freshProfile.filingTypes ?? [freshProfile.taxpayerType]), filingTypeId], catalog.types.map((item) => item.id));
  await store.updateProfile(freshProfile.id, {
    name: freshProfile.name,
    phone: freshProfile.phone,
    address: freshProfile.address,
    city: freshProfile.city,
    state: freshProfile.state,
    zip: freshProfile.zip,
    taxpayerType: filingTypes.some(isTaxpayerType) ? primaryFilingType(filingTypes) : freshProfile.taxpayerType,
    filingTypes,
    spouseName: freshProfile.spouseName,
    taxYears: freshProfile.taxYears,
  });
  if (!current.desk.intakeAnswered || !current.services.includes("tax_return") || current.stage === "lead" || current.stage === "onboarding") {
    const saved = await store.updateWorkflow(current.id, {
      ...current,
      stage: current.stage === "lead" || current.stage === "onboarding" ? "documents" : current.stage,
      services: current.services.includes("tax_return") ? current.services : [...current.services, "tax_return"],
      desk: { ...current.desk, intakeAnswered: true, filingNeeds: [] },
    });
    if (!saved) throw new Error("This return changed. Refresh and try again.");
  }
  const opened = (await store.listTeamReturns()).find((row) => row.id === current.id) ?? current;
  await seedOrganizer(freshProfile.id, opened.id, await firmAuthorId(), filingTypeId, opened.desk);
  await syncRequestStage(freshProfile.id, opened.id);
  await runEnteredStage(opened.id);
  revalidateReturn(freshProfile.id, opened.id);
}

export async function addYearFilingType(_state: { error: string | null }, formData: FormData): Promise<{ error: string | null }> {
  try {
    const profile = await requireProfile("client");
    const taxYear = Number(formData.get("year"));
    const filingTypeId = String(formData.get("filingTypeId") ?? "");
    const store = getStore();
    const [catalog, owned] = await Promise.all([store.getFilingCatalog(), store.listTeamReturns()]);
    const type = catalog.types.find((item) => item.id === filingTypeId && !item.retired);
    if (!type) return { error: "Choose a return type." };
    if (!Number.isInteger(taxYear) || taxYear < 1900 || taxYear > 9999) return { error: "Choose a tax year." };
    const open = owned.some((row) => row.profileId === profile.id && !row.archivedAt && row.stage !== "canceled" && row.taxYear === taxYear && (row.filingTypeId || row.taxpayerType) === filingTypeId);
    if (open) return { error: `You already have a ${type.label} return for ${taxYear}.` };
    await openClientReturn(profile, taxYear, filingTypeId);
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not open that return." };
  }
}

export async function cancelClientReturn(_state: { error: string | null }, formData: FormData): Promise<{ error: string | null }> {
  try {
    const profile = await requireProfile("client");
    const id = String(formData.get("returnId") ?? "");
    const store = getStore();
    const current = (await store.listTeamReturns()).find((row) => row.id === id && row.profileId === profile.id && !row.archivedAt);
    if (!current) return { error: "That return is no longer on your list." };
    if (!clientMayCancel(current.stage)) return { error: "The firm has already started this return. Ask them to close it." };
    await store.addMessage({
      profileId: profile.id,
      returnId: current.id,
      authorId: profile.id,
      authorRole: "client",
      kind: "event",
      body: `Cancelled the ${current.taxYear} return.`,
    });
    await runReturnCancelled(current.id);
    revalidateReturn(profile.id, current.id);
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not cancel that return." };
  }
}

export async function saveFilingCatalog(_state: { error: string | null }, data: FormData): Promise<{ error: string | null }> {
  await requireProfile("staff");
  const raw = String(data.get("catalog") ?? "");
  if (raw.length > 100_000) return { error: "That catalog is too large." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Could not read the catalog." };
  }
  const catalog = parseFilingCatalog(parsed);
  const store = getStore();
  const [existing, team] = await Promise.all([store.getFilingCatalog(), store.listTeamReturns()]);
  const used = new Set(team.map((row) => row.filingTypeId || row.taxpayerType));
  for (const previous of existing.types) {
    if (catalog.types.some((type) => type.id === previous.id)) continue;
    if (isTaxpayerType(previous.id)) return { error: `Retire ${previous.label} instead of deleting it.` };
    if (used.has(previous.id)) return { error: `Retire ${previous.label}. A return already uses it.` };
  }
  await store.saveFilingCatalog(catalog);
  revalidatePath("/settings/filings");
  revalidatePath("/portal/documents");
  revalidatePath("/portal/profile");
  revalidatePath("/contacts");
  return { error: null };
}

export async function createTaxReturn(profileId: string, data: FormData) {
  await requireProfile("staff");
  const store = getStore();
  const client = await store.getProfile(profileId);
  const taxYear = Number(data.get("year"));
  const entity = String(data.get("entity") ?? "").trim();
  const taxpayerType = String(data.get("type") ?? "");
  if (client?.role !== "client" || !isTaxpayerType(taxpayerType) ||
      !Number.isInteger(taxYear) || taxYear < 1900 || taxYear > 9999 || !entity || entity.length > 150) {
    throw new Error("Enter the taxpayer name, return type, and four-digit tax year.");
  }
  await store.createReturn({ profileId, taxYear, entity, taxpayerType });
  const opened = (await store.listReturns(profileId)).find((item) => item.taxYear === taxYear && item.taxpayerType === taxpayerType && item.entity.toLowerCase() === entity.toLowerCase());
  if (opened) await runEnteredStage(opened.id);
  revalidatePath(`/contacts/${profileId}`);
  revalidatePath("/returns");
  revalidatePath("/portal");
}

export async function moveReturnStage(id: string, revision: number, stage: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const staff = await requireProfile("staff");
  if (!isStage(stage)) return { ok: false, error: "That stage is not on the desk." };
  const current = (await getStore().listTeamReturns()).find((row) => row.id === id);
  if (!current || current.revision !== revision) return { ok: false, error: "This return changed. Refresh and try the move again." };
  const forward = nextStage(current.stage);
  const back = sendBackTarget(current.stage);
  if (stage !== forward && stage !== back) return { ok: false, error: "Move a return one stage at a time." };
  const context = await gateContext(current.profileId, id);
  const profile = context.profile;
  const workflow = context.workflow;
  if (!profile || !workflow) return { ok: false, error: "Return not found." };
  if (stage === forward) {
    const blocker = advanceBlocker({ ...context, workflow, profile });
    if (blocker) return { ok: false, error: blocker };
    if (stage === "documents") await seedOrganizer(current.profileId, id, staff.id, current.filingTypeId || current.taxpayerType, current.desk);
  } else {
    const blocker = sendBackBlocker(current.stage, context.filings);
    if (blocker) return { ok: false, error: blocker };
  }
  const derived = deriveStage({ ...current, stage }, context.threads);
  const now = new Date().toISOString();
  const leavingReview = current.stage === "review" && stage === forward;
  const leavingDelivery = current.stage === "delivery" && stage === forward;
  const saved = await context.store.updateWorkflow(id, {
    ...current,
    revision,
    stage,
    waitingOn: derived.waitingOn,
    nextAction: derived.nextAction || current.nextAction,
    reviewerId: leavingReview ? staff.id : stage === back ? null : current.reviewerId,
    reviewedAt: leavingReview ? now : stage === back ? null : current.reviewedAt,
    deliveredAt: leavingDelivery ? now : current.deliveredAt,
    archivedAt: leavingDelivery ? now : current.archivedAt,
  });
  if (!saved) return { ok: false, error: "This return changed. Refresh and try the move again." };
  await runEnteredStage(id);
  if (stage === back) {
    await context.store.addMessage({
      profileId: current.profileId,
      returnId: id,
      authorId: staff.id,
      authorRole: "staff",
      kind: "note",
      body: `Sent back to ${stages[stage]} from the desk.`,
    });
  }
  if (leavingDelivery) {
    await context.store.addMessage({
      profileId: current.profileId,
      returnId: id,
      authorId: staff.id,
      authorRole: "staff",
      kind: "event",
      body: "Delivered the return and archived the file.",
    });
  }
  revalidateReturn(current.profileId, id);
  return { ok: true };
}

export async function saveReturnWorkflow(id: string, revision: number, data: FormData) {
  const staff = await requireProfile("staff");
  const store = getStore();
  const owner = String(data.get("owner") ?? "") || null;
  const due = String(data.get("due") ?? "") || null;
  const nextAction = String(data.get("nextAction") ?? "").trim();
  const parsedDate = due && new Date(due + "T00:00:00Z");
  if (nextAction.length > 500 || (parsedDate && (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== due))) {
    throw new Error("Check the due date and the handoff note.");
  }
  if (owner) await requireActiveStaff(owner);
  const current = (await store.listTeamReturns()).find((row) => row.id === id);
  const returnTo = data.get("returnTo") === "/tasks/table" ? "/tasks/table" : "/returns";
  if (!current || current.revision !== revision) redirect(`${returnTo}?conflict=1`);
  const ownerChanged = (current.owner ?? null) !== owner;
  const dueChanged = (current.due ?? null) !== due;
  const saved = await store.updateWorkflow(id, { ...current, revision, owner, due, nextAction });
  if (saved && (ownerChanged || dueChanged)) {
    const parts: string[] = [];
    if (ownerChanged) {
      const person = owner ? await store.getProfile(owner) : null;
      parts.push(owner ? `Assigned preparer ${person?.name || person?.email || "a teammate"}` : "Cleared the preparer");
    }
    if (dueChanged) parts.push(due ? `Set the due date to ${due}` : "Cleared the due date");
    await store.addMessage({
      profileId: current.profileId,
      returnId: id,
      authorId: staff.id,
      authorRole: "staff",
      kind: "note",
      body: `${parts.join(". ")}.`,
    });
  }
  revalidatePath("/returns");
  revalidatePath("/tasks");
  revalidatePath("/tasks/table");
  revalidatePath(`/returns/${current.profileId}/${id}`);
  if (!saved) redirect(`${returnTo}?conflict=1`);
}

function selectedServices(data: FormData) {
  return serviceLines.filter((line) => data.getAll("services").includes(line));
}

function amountCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  const cents = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  return Number.isSafeInteger(cents) ? cents : null;
}

async function gateContext(profileId: string, returnId: string) {
  const store = getStore();
  const [profile, signatures, messages, authorizations, invoices, filings, team, catalog] = await Promise.all([
    store.getProfile(profileId),
    store.listSignatures(profileId),
    store.listMessages(profileId),
    store.listAuthorizations(returnId),
    store.listInvoices(returnId),
    store.listFilings(returnId),
    store.listTeamReturns(),
    store.getFilingCatalog(),
  ]);
  const workflow = team.find((row) => row.id === returnId && row.profileId === profileId) ?? null;
  const threads = requestThreads(messages.filter((row) => row.returnId === returnId));
  return { store, profile, signatures, messages, authorizations, invoice: invoices[0] ?? null, filings, workflow, threads, catalog };
}

export async function sendOrganizer(profileId: string, returnId: string) {
  const staff = await requireProfile("staff");
  const store = getStore();
  const [profile, team] = await Promise.all([store.getProfile(profileId), store.listTeamReturns()]);
  const item = team.find((row) => row.id === returnId && row.profileId === profileId);
  if (!profile || profile.role !== "client" || !item) throw new Error("Return not found.");
  if (item.stage !== "documents") throw new Error("The organizer is part of document collection.");
  await seedOrganizer(profileId, returnId, staff.id, item.filingTypeId || item.taxpayerType, item.desk);
  await syncRequestStage(profileId, returnId);
  revalidateReturn(profileId, returnId);
}

export async function saveReturnDesk(profileId: string, returnId: string, revision: number, data: FormData) {
  const staff = await requireProfile("staff");
  const store = getStore();
  const current = (await store.listTeamReturns()).find((row) => row.id === returnId && row.profileId === profileId);
  if (!current || current.revision !== revision) redirect(`/returns/${profileId}/${returnId}?conflict=1`);
  const intent = String(data.get("intent") ?? "");
  const desk = {
    ...current.desk,
    preparationChecks: { ...current.desk.preparationChecks },
    reviewChecks: { ...current.desk.reviewChecks },
    issues: [...current.desk.issues],
  };
  let note = "";
  let reviewerId = current.reviewerId;
  let stage = current.stage;
  if (intent === "check") {
    const area = String(data.get("area") ?? "");
    const key = String(data.get("key") ?? "");
    const done = String(data.get("done") ?? "") === "1";
    const items = area === "preparation"
      ? preparationChecklist(current.taxpayerType)
      : area === "review"
        ? reviewChecklist(current.taxpayerType)
        : null;
    const item = items?.find((row) => row.key === key);
    if (!item) throw new Error("That checklist item is not on this return.");
    const record = { done, at: done ? new Date().toISOString() : null };
    if (area === "preparation") desk.preparationChecks[key] = record;
    else desk.reviewChecks[key] = record;
    note = `${area === "preparation" ? "Preparation checklist" : "Review checklist"}: ${item.label} ${done ? "marked done" : "reopened"}.`;
  } else if (intent === "software") {
    const softwareName = String(data.get("softwareName") ?? "").trim();
    const softwareReference = String(data.get("softwareReference") ?? "").trim();
    const softwareStatus = String(data.get("softwareStatus") ?? "").trim();
    if (softwareName.length > 80 || softwareReference.length > 80 || softwareStatus.length > 80) throw new Error("Use 80 characters or fewer.");
    desk.softwareName = softwareName;
    desk.softwareReference = softwareReference;
    desk.softwareStatus = softwareStatus;
    note = "Tax software reference saved.";
  } else if (intent === "issue") {
    const area = String(data.get("area") ?? "");
    const title = String(data.get("title") ?? "").trim();
    const detail = String(data.get("detail") ?? "").trim();
    const priority = String(data.get("priority") ?? "");
    const assigneeId = String(data.get("assignee") ?? "");
    if (area !== "preparation" && area !== "review") throw new Error("Choose where this issue belongs.");
    if (!title || title.length > 120 || detail.length > 1000) throw new Error("Enter a title for the issue.");
    if (priority !== "low" && priority !== "normal" && priority !== "high") throw new Error("Choose a priority.");
    if (assigneeId) await requireActiveStaff(assigneeId);
    desk.issues.push({
      id: randomUUID(),
      area,
      title,
      detail,
      priority,
      assigneeId: assigneeId || null,
      blocking: data.get("blocking") === "1",
      status: "open",
      checkKey: null,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    });
    note = `${area === "review" ? "Review correction" : "Preparation issue"}: ${title}.`;
  } else if (intent === "resolve" || intent === "reopen") {
    const id = String(data.get("id") ?? "");
    const issue = desk.issues.find((row) => row.id === id);
    if (!issue) throw new Error("That issue is no longer on this return.");
    issue.status = intent === "resolve" ? "resolved" : "open";
    issue.resolvedAt = intent === "resolve" ? new Date().toISOString() : null;
    note = `${issue.area === "review" ? "Review correction" : "Preparation issue"}: ${issue.title} ${intent === "resolve" ? "resolved" : "reopened"}.`;
  } else if (intent === "reviewer") {
    const nextReviewer = String(data.get("reviewer") ?? "");
    if (nextReviewer) await requireActiveStaff(nextReviewer);
    reviewerId = nextReviewer || null;
    const person = nextReviewer ? await store.getProfile(nextReviewer) : null;
    note = nextReviewer ? `Assigned reviewer ${person?.name || person?.email || "a teammate"}.` : "Cleared the reviewer.";
  } else if (intent === "reopen-review") {
    desk.reviewedVersion = null;
    if (current.stage !== "lead" && current.stage !== "onboarding" && current.stage !== "documents" && current.stage !== "preparation" && current.stage !== "review") {
      stage = "review";
    }
    note = "Review reopened.";
  } else {
    throw new Error("That update is not available.");
  }
  const saved = await store.updateWorkflow(returnId, { ...current, revision, reviewerId, stage, desk });
  if (!saved) redirect(`/returns/${profileId}/${returnId}?conflict=1`);
  if (note) {
    await store.addMessage({
      profileId,
      returnId,
      authorId: staff.id,
      authorRole: "staff",
      kind: "note",
      body: note,
    });
  }
  if (stage !== current.stage) await runEnteredStage(returnId);
  revalidateReturn(profileId, returnId);
}

export async function saveEngagementFacts(id: string, revision: number, data: FormData) {
  await requireProfile("staff");
  const source = String(data.get("source") ?? "");
  if (!isLeadSource(source)) throw new Error("Choose how this client arrived.");
  const store = getStore();
  const current = (await store.listTeamReturns()).find((row) => row.id === id);
  if (!current || current.revision !== revision) redirect("/returns?conflict=1");
  const saved = await store.updateWorkflow(id, { ...current, revision, source, services: selectedServices(data) });
  revalidateReturn(current.profileId, id);
  if (!saved) redirect(`/returns/${current.profileId}/${id}?conflict=1`);
}

export async function advanceEngagement(id: string, revision: number, data: FormData) {
  const staff = await requireProfile("staff");
  const note = String(data.get("note") ?? "").trim();
  if (note.length > 500) throw new Error("Use 500 characters or fewer.");
  const current = (await getStore().listTeamReturns()).find((row) => row.id === id);
  if (!current || current.revision !== revision) redirect("/returns?conflict=1");
  const context = await gateContext(current.profileId, id);
  const profile = context.profile;
  const workflow = context.workflow;
  if (!profile || !workflow) throw new Error("Return not found.");
  const blocker = advanceBlocker({ ...context, workflow, profile, note });
  if (blocker) throw new Error(blocker);
  const gate = { ...context, workflow, profile, note };
  const desk = { ...current.desk, issues: [...current.desk.issues] };
  if (current.stage === "preparation") {
    const lines = preparationBlockers(gate);
    if (lines.length > 0) throw new Error(lines.join(" "));
    desk.preparedVersion = current.returnVersion;
  }
  if (current.stage === "review") {
    const lines = reviewBlockers(gate);
    if (lines.length > 0) throw new Error(lines.join(" "));
    desk.reviewedVersion = current.returnVersion;
  }
  const stage = nextStage(current.stage);
  if (!stage) throw new Error("This engagement has no further stage.");
  if (stage === "documents") await seedOrganizer(current.profileId, id, staff.id, current.filingTypeId || current.taxpayerType, current.desk);
  const messages = await context.store.listMessages(current.profileId);
  const derived = deriveStage({ ...current, stage }, requestThreads(messages.filter((row) => row.returnId === id)));
  const now = new Date().toISOString();
  const saved = await context.store.updateWorkflow(id, {
    ...current,
    revision,
    stage,
    waitingOn: derived.waitingOn,
    nextAction: note || derived.nextAction,
    reviewerId: current.stage === "review" ? staff.id : current.reviewerId,
    reviewedAt: current.stage === "review" ? now : current.reviewedAt,
    deliveredAt: current.stage === "delivery" ? now : current.deliveredAt,
    archivedAt: current.stage === "delivery" ? now : current.archivedAt,
    desk,
  });
  if (!saved) redirect(`/returns/${current.profileId}/${id}?conflict=1`);
  await runEnteredStage(id);
  if (current.stage === "preparation") {
    const reviewer = current.reviewerId ? await context.store.getProfile(current.reviewerId) : null;
    const who = reviewer ? ` Assigned reviewer ${reviewer.name || reviewer.email}.` : " No reviewer is assigned yet.";
    await context.store.addMessage({
      profileId: current.profileId, returnId: id, authorId: staff.id, authorRole: "staff", kind: "note",
      body: `Preparation submitted for version ${current.returnVersion}.${who}`,
    });
  }
  if (current.stage === "review" && note) {
    await context.store.addMessage({
      profileId: current.profileId, returnId: id, authorId: staff.id, authorRole: "staff", kind: "note",
      body: `Reviewer approval: ${note}`,
    });
  }
  if (current.stage === "delivery") {
    await context.store.addMessage({
      profileId: current.profileId, returnId: id, authorId: staff.id, authorRole: "staff", kind: "event",
      body: "Delivered the return and archived the file.",
    });
  }
  revalidateReturn(current.profileId, id);
}

export async function sendBackEngagement(id: string, revision: number, data: FormData) {
  const staff = await requireProfile("staff");
  const reason = String(data.get("reason") ?? "").trim();
  if (!reason || reason.length > 500) throw new Error("Say what has to change.");
  const store = getStore();
  const current = (await store.listTeamReturns()).find((row) => row.id === id);
  if (!current || current.revision !== revision) redirect("/returns?conflict=1");
  const filings = await store.listFilings(id);
  const blocker = sendBackBlocker(current.stage, filings);
  if (blocker) throw new Error(blocker);
  const stage = sendBackTarget(current.stage);
  if (!stage) throw new Error("This stage cannot be sent back.");
  const messages = await store.listMessages(current.profileId);
  const derived = deriveStage({ ...current, stage }, requestThreads(messages.filter((row) => row.returnId === id)));
  const correction: DeskIssue = {
    id: randomUUID(),
    area: "review",
    title: reason.slice(0, 120),
    detail: reason,
    priority: "high",
    assigneeId: current.owner,
    blocking: true,
    status: "open",
    checkKey: null,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  const saved = await store.updateWorkflow(id, {
    ...current,
    revision,
    stage,
    waitingOn: derived.waitingOn,
    nextAction: reason,
    desk: {
      ...current.desk,
      preparedVersion: null,
      reviewedVersion: null,
      issues: [...current.desk.issues, correction],
    },
  });
  if (!saved) redirect(`/returns/${current.profileId}/${id}?conflict=1`);
  await runEnteredStage(id);
  await store.addMessage({
    profileId: current.profileId, returnId: id, authorId: staff.id, authorRole: "staff", kind: "note",
    body: `Review correction: ${reason} Sent back to ${stages[stage]}.`,
  });
  revalidateReturn(current.profileId, id);
}

export async function saveInvoiceRecord(profileId: string, returnId: string, data: FormData) {
  await requireProfile("staff");
  const status = String(data.get("status") ?? "");
  const instructions = String(data.get("instructions") ?? "").trim();
  const cents = amountCents(String(data.get("amount") ?? ""));
  if (!isInvoiceStatus(status) || cents == null || instructions.length > 1000) {
    throw new Error("Enter the fee, the invoice status, and payment instructions.");
  }
  const store = getStore();
  const item = (await store.listTeamReturns()).find((row) => row.id === returnId && row.profileId === profileId);
  if (!item) throw new Error("Return not found.");
  await store.saveInvoice({ returnId, amountCents: cents, status, instructions });
  revalidateReturn(profileId, returnId);
}

export async function createLead(data: FormData) {
  await requireProfile("staff");
  const email = String(data.get("email") ?? "").trim().toLowerCase();
  const name = String(data.get("name") ?? "").trim();
  const source = String(data.get("source") ?? "");
  const entity = String(data.get("entity") ?? "").trim();
  const taxpayerType = String(data.get("type") ?? "");
  const taxYear = Number(data.get("year"));
  if (!name || !email.includes("@") || !isLeadSource(source) || !isTaxpayerType(taxpayerType) || !entity || entity.length > 150) {
    throw new Error("Enter the name, email, source, taxpayer, and return.");
  }
  if (!Number.isInteger(taxYear) || taxYear < 1900 || taxYear > 9999) throw new Error("Enter a four-digit tax year.");
  const store = getStore();
  const client = await store.createClient({ email, name });
  if (client.role !== "client") throw new Error("That email belongs to a teammate.");
  const existing = (await store.listReturns(client.id)).find((item) => item.taxYear === taxYear && item.taxpayerType === taxpayerType && item.entity.toLowerCase() === entity.toLowerCase());
  if (existing) throw new Error("That return is already open.");
  await store.createReturn({ profileId: client.id, taxYear, entity, taxpayerType, source, services: [] });
  const opened = (await store.listTeamReturns()).find((row) => row.profileId === client.id && row.taxYear === taxYear && row.entity.toLowerCase() === entity.toLowerCase() && row.taxpayerType === taxpayerType);
  if (opened) await runEnteredStage(opened.id);
  revalidatePath("/contacts");
  revalidatePath("/returns");
  redirect("/returns?stage=lead");
}

export async function openNextYear(profileId: string, returnId: string) {
  await requireProfile("staff");
  const store = getStore();
  const current = (await store.listTeamReturns()).find((row) => row.id === returnId && row.profileId === profileId);
  if (!current) throw new Error("Return not found.");
  if (current.stage !== "renewal") throw new Error("Move the file to year-round services before opening next year.");
  const taxYear = current.taxYear + 1;
  if (taxYear > 9999) throw new Error("Next year is out of range.");
  const existing = (await store.listReturns(profileId)).find((item) => item.taxYear === taxYear && item.taxpayerType === current.taxpayerType && item.entity.toLowerCase() === current.entity.toLowerCase());
  if (existing) throw new Error("Next year is already open.");
  await store.createReturn({
    profileId,
    taxYear,
    entity: current.entity,
    taxpayerType: current.taxpayerType,
    source: "returning",
    services: current.services,
  });
  const opened = (await store.listReturns(profileId)).find((item) => item.taxYear === taxYear && item.taxpayerType === current.taxpayerType && item.entity.toLowerCase() === current.entity.toLowerCase());
  if (opened) await runEnteredStage(opened.id);
  revalidatePath("/returns");
  revalidatePath(`/contacts/${profileId}`);
  redirect("/returns?stage=lead");
}

export async function recordIntakeReview(profileId: string, returnId: string, data: FormData) {
  const staff = await requireProfile("staff");
  const store = getStore();
  const item = (await store.listReturns(profileId)).find(row => row.id === returnId);
  if (!item) throw new Error("Return not found.");
  const action = String(data.get("action"));
  const detail = String(data.get("detail") ?? "").trim();
  const reference = String(data.get("file") ?? "");
  const prefix = `${item.entity} · ${item.taxYear}`;
  let documentId: string | undefined;
  let signatureId: string | undefined;
  let body: string;
  if (detail.length > 1000) throw new Error("Use 1,000 characters or fewer.");
  if (action === "accept") {
    const [documents, signatures] = await Promise.all([store.listDocuments(profileId), store.listSignatures(profileId)]);
    const document = documents.find(row => row.id === reference);
    const signature = signatures.find(row => row.id === reference);
    if (!document && !signature) throw new Error("Choose a file on this client's account.");
    documentId = document?.id;
    signatureId = signature?.id;
    body = `Reviewed for ${prefix}: ${document?.filename ?? signature?.kind + " signed PDF"}.`;
  } else if ((action === "request" || action === "note") && detail) {
    body = `${prefix} — ${action === "request" ? "Requested from client" : "Team note"}: ${detail}`;
  } else {
    throw new Error("Enter the request or note.");
  }
  const block = String(data.get("block") ?? "");
  if (action === "request" && !isRequestBlock(block)) throw new Error("Choose whether this request blocks starting, filing, or neither.");
  await store.addMessage({profileId, returnId, documentId, signatureId, requestState: action === "request" ? "open" : undefined, requestBlock: action === "request" && isRequestBlock(block) ? block : undefined, authorId: staff.id,
    authorRole: "staff", kind: action === "request" ? "message" : "note", body});
  if (action === "request") await syncRequestStage(profileId, returnId);
  await runDocumentsReady(profileId, returnId);
  revalidateReturn(profileId, returnId);
}

export async function advanceRequest(profileId: string, previousId: string, form: FormData) {
  const actor = await requireProfile();
  if (actor.role === "client" && actor.id !== profileId) throw new Error("Request unavailable.");
  const store = getStore();
  const messages = await store.listMessages(profileId);
  const previous = messages.find(row => row.id === previousId);
  if (!previous?.returnId || !previous.requestState || messages.some(row => row.previousId === previousId)) {
    throw new Error("This request changed. Refresh to see the latest status.");
  }
  const decision = String(form.get("decision"));
  let state: RequestState;
  let body: string;
  let documentId = previous.documentId ?? undefined;
  const root = requestRoot(messages, previousId);
  if (actor.role === "client" && (previous.requestState === "open" || previous.requestState === "replacement")) {
    if (decision === "unavailable") {
      const reason = String(form.get("reason") ?? "").trim();
      if (!reason || reason.length > 1000) throw new Error("Say whether it was not issued, or when you can send it.");
      state = "unavailable";
      body = `Unavailable: ${reason}`;
    } else {
      const file = form.get("file");
      if (!(file instanceof File) || !file.size || file.size > 15 * 1024 * 1024) throw new Error("Choose a file up to 15 MB.");
      const requestedKind = String(form.get("kind") ?? "");
      const kind = isDocumentKind(requestedKind) ? requestedKind : "other";
      const doc = await store.addDocument({
        profileId,
        returnId: previous.returnId,
        kind,
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        bytes: Buffer.from(await file.arrayBuffer()),
      });
      documentId = doc.id;
      body = `Uploaded ${doc.filename} for review.`;
      state = "responded";
    }
  } else if (actor.role === "staff" && (previous.requestState === "responded" || previous.requestState === "unavailable") && (decision === "accepted" || decision === "replacement" || decision === "waived")) {
    state = decision;
    const reason = String(form.get("reason") ?? "").trim();
    if (decision !== "accepted" && (!reason || reason.length > 1000)) throw new Error("Explain the reason for the client.");
    body = decision === "accepted" ? "Document accepted." : decision === "waived" ? `Waived: ${reason}` : `Replacement requested: ${reason}`;
  } else throw new Error("This action is unavailable.");
  await store.addMessage({profileId, previousId, returnId:previous.returnId, documentId, requestBlock: root?.requestBlock ?? undefined,
    requestState:state, authorId:actor.id, authorRole:actor.role, kind:"event", body});
  if (state === "replacement" && actor.role === "staff" && process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    const client = await store.getProfile(profileId);
    if (client?.role === "client" && client.email) {
      const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.EMAIL_FROM,
        to: client.email,
        subject: "A document needs a correction",
        text: `A document on your tax return needs a correction. Sign in to see what to send. ${siteUrl}/portal`,
      });
      if (result.error) {
        await store.addMessage({
          profileId,
          returnId: previous.returnId,
          authorId: actor.id,
          authorRole: "staff",
          kind: "note",
          body: "Client email for the correction request could not be sent.",
        });
      }
    }
  }
  await syncRequestStage(profileId, previous.returnId);
  await runDocumentsReady(profileId, previous.returnId);
  revalidateReturn(profileId, previous.returnId);
}

export async function remindRequest(profileId: string, latestId: string) {
  const actor = await requireProfile("staff");
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) throw new Error("Configure the firm's email sender first.");
  const store = getStore();
  const [client,messages] = await Promise.all([store.getProfile(profileId),store.listMessages(profileId)]);
  const latest = messages.find(row => row.id === latestId);
  if (client?.role !== "client" || !latest?.returnId || !["open","replacement"].includes(latest.requestState ?? "") ||
      messages.some(row => row.previousId === latestId)) throw new Error("Refresh the request status before sending.");
  const {Resend} = await import("resend");
  const {siteUrl} = await import("@/lib/firm");
  const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from:process.env.EMAIL_FROM,to:client.email,subject:"An item is waiting in your tax portal",
    text:`Please sign in to review your outstanding document request. ${siteUrl}/portal`,
  },{idempotencyKey:`request-${latestId}-${new Date().toISOString().slice(0,10)}`});
  if (result.error) throw new Error("Reminder delivery could not be confirmed.");
  await store.addMessage({profileId,returnId:latest.returnId,authorId:actor.id,authorRole:"staff",kind:"note",body:"Email reminder submitted for the outstanding document request."});
  revalidateReturn(profileId, latest.returnId);
}

export async function saveFiling(profileId: string, returnId: string, form: FormData) {
  const staff = await requireProfile("staff");
  const jurisdiction = String(form.get("jurisdiction"));
  const status = String(form.get("status"));
  const note = String(form.get("note") ?? "").trim();
  const region = String(form.get("region") ?? "");
  if (!isFilingJurisdiction(jurisdiction) || !isFilingStatus(status) || note.length > 1000) throw new Error("Check the filing jurisdiction and status.");
  if (jurisdiction === "state" && !/^[A-Za-z]{2}$/.test(region.trim())) throw new Error("Enter the two-letter state.");
  const store = getStore();
  const item = (await store.listTeamReturns()).find((row) => row.id === returnId && row.profileId === profileId);
  if (!item) throw new Error("Return not found.");
  const regionKey = jurisdiction === "state" ? region.trim().toUpperCase() : "";
  const prior = (await store.listFilings(returnId)).find((row) => row.jurisdiction === jurisdiction && row.region.toUpperCase() === regionKey);
  const saved = await store.saveFiling({ returnId, jurisdiction, region, status, note });
  if (!prior || prior.status !== saved.status || prior.note !== saved.note) {
    const detail = saved.note ? ` ${saved.note}` : "";
    await store.addMessage({
      profileId,
      returnId,
      authorId: staff.id,
      authorRole: "staff",
      kind: "note",
      body: `Recorded ${filingPlace(saved)} as ${filingStatusLabel(saved.status)}.${detail} The firm entered this status. It is not an IRS e-file receipt.`,
    });
  }
  if (status === "signature") await ensureAuthorizations(profileId, returnId, item.returnVersion);
  const messages = await store.listMessages(profileId);
  const derived = deriveStage(item, requestThreads(messages.filter((row) => row.returnId === returnId)));
  const nextAction = derived.waitingOn || derived.nextAction.startsWith("Review:") || derived.nextAction.startsWith("Still waiting:")
    ? derived.nextAction
    : item.stage === "filing"
      ? filingPrompt(saved)
      : item.nextAction;
  let desk = item.desk;
  if (saved.status === "rejected") {
    const title = `Correct the rejected ${filingPlace(saved)} return`;
    if (!desk.issues.some((issue) => issue.status === "open" && issue.title === title)) {
      desk = {
        ...desk,
        issues: [...desk.issues, {
          id: randomUUID(),
          area: "preparation",
          title,
          detail: saved.note || "The filing was rejected. If the return numbers change, create a new version so Form 8879 is signed again before it is resent.",
          priority: "high",
          assigneeId: item.owner,
          blocking: true,
          status: "open",
          checkKey: null,
          createdAt: new Date().toISOString(),
          resolvedAt: null,
        }],
      };
    }
  }
  await store.updateWorkflow(returnId, { ...item, waitingOn: derived.waitingOn, nextAction, desk });
  if (saved.status === "accepted") await runFilingAccepted(returnId);
  revalidateReturn(profileId, returnId);
}

export async function requestSignatures(profileId: string, returnId: string) {
  const staff = await requireProfile("staff");
  const store = getStore();
  const item = (await store.listTeamReturns()).find((row) => row.id === returnId && row.profileId === profileId);
  if (!item) throw new Error("Return not found.");
  await ensureAuthorizations(profileId, returnId, item.returnVersion);
  await store.addMessage({ profileId, returnId, authorId: staff.id, authorRole: "staff", kind: "event", body: `Asked for Form 8879 on version ${item.returnVersion}.` });
  const fresh = (await store.listTeamReturns()).find((row) => row.id === returnId);
  if (fresh) {
    const messages = await store.listMessages(profileId);
    const derived = deriveStage(fresh, requestThreads(messages.filter((row) => row.returnId === returnId)));
    await store.updateWorkflow(returnId, {
      ...fresh,
      waitingOn: derived.waitingOn,
      nextAction: derived.waitingOn ? derived.nextAction : "Collect Form 8879 before e-file",
    });
  }
  revalidateReturn(profileId, returnId);
}

export async function reviseReturn(profileId: string, returnId: string) {
  const staff = await requireProfile("staff");
  const store = getStore();
  const item = (await store.listTeamReturns()).find((row) => row.id === returnId && row.profileId === profileId);
  if (!item) throw new Error("Return not found.");
  const version = await store.bumpReturnVersion(returnId);
  if (!version) throw new Error("This return changed. Refresh and try again.");
  await ensureAuthorizations(profileId, returnId, version);
  await store.addMessage({ profileId, returnId, authorId: staff.id, authorRole: "staff", kind: "event", body: `Return version ${version}. Form 8879 must be signed again.` });
  const fresh = (await store.listTeamReturns()).find((row) => row.id === returnId);
  if (fresh) {
    const messages = await store.listMessages(profileId);
    const derived = deriveStage(fresh, requestThreads(messages.filter((row) => row.returnId === returnId)));
    await store.updateWorkflow(returnId, {
      ...fresh,
      waitingOn: derived.waitingOn,
      nextAction: derived.waitingOn ? derived.nextAction : "Collect Form 8879 before e-file",
    });
  }
  revalidateReturn(profileId, returnId);
}

export async function attestEfile(returnId: string, form: FormData) {
  const profile = await requireProfile("client");
  const signer = String(form.get("signer"));
  const typed = String(form.get("name") ?? "");
  if (!isEfileSigner(signer) || form.get("confirm") !== "yes") throw new Error("Confirm the authorization.");
  const store = getStore();
  const [fresh, returns, rows] = await Promise.all([store.getProfile(profile.id), store.listReturns(profile.id), store.listAuthorizations(returnId)]);
  const item = returns.find((row) => row.id === returnId);
  if (!fresh || !item) throw new Error("Return not found.");
  const expected = signer === "taxpayer" ? fresh.name : fresh.spouseName;
  if (!expected.trim() || !sameName(typed, expected)) throw new Error("Type the name on this return.");
  const current = rows.find((row) => row.signer === signer && row.returnVersion === item.returnVersion && row.status === "needed");
  if (!current) throw new Error("This version does not need that signature.");
  const headerList = await headers();
  await store.saveAuthorization({
    returnId, signer, returnVersion: item.returnVersion, method: "attested", status: "signed", signedAt: new Date().toISOString(),
    evidence: `Attested ${typed}. ${headerList.get("x-forwarded-for") ?? "local"}. ${(headerList.get("user-agent") ?? "unknown").slice(0, 180)}`,
  });
  await store.addMessage({
    profileId: profile.id, returnId, authorId: profile.id, authorRole: "client", kind: "event",
    body: signer === "spouse" ? "Spouse authorized e-file for this return version." : "Authorized e-file for this return version.",
  });
  await runEfileSigned(returnId);
  revalidateReturn(profile.id, returnId);
  redirect("/portal");
}

export async function recordManualEfile(profileId: string, returnId: string, form: FormData) {
  const staff = await requireProfile("staff");
  const signer = String(form.get("signer"));
  const note = String(form.get("note") ?? "").trim();
  if (!isEfileSigner(signer) || !note || note.length > 1000) throw new Error("Say how the paper signature was received.");
  const store = getStore();
  const item = (await store.listTeamReturns()).find((row) => row.id === returnId && row.profileId === profileId);
  if (!item) throw new Error("Return not found.");
  const current = (await store.listAuthorizations(returnId)).find((row) => row.signer === signer && row.returnVersion === item.returnVersion && row.status === "needed");
  if (!current) throw new Error("Ask for Form 8879 on this version first.");
  await store.saveAuthorization({
    returnId, signer, returnVersion: item.returnVersion, method: "manual", status: "signed", signedAt: new Date().toISOString(),
    evidence: `Paper signature recorded by staff. ${note}`,
  });
  await store.addMessage({ profileId, returnId, authorId: staff.id, authorRole: "staff", kind: "event", body: `Recorded a paper Form 8879 for the ${signer} on version ${item.returnVersion}.` });
  await runEfileSigned(returnId);
  revalidateReturn(profileId, returnId);
}
