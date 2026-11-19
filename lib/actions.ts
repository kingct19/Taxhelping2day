"use server";

import { stages, type Workflow } from "@/lib/return-workflow";
import { deriveStage, filingPrompt } from "@/lib/next-action";
import { requestRoot, requestThreads } from "@/lib/request-thread";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { buildSignedPdf } from "@/lib/pdf";
import { documentKinds, isEfileSigner, isFilingJurisdiction, isFilingStatus, isRequestBlock, isTaskStatus, taxpayerTypes, type DocumentKind, type EfileSigner, type RequestState, type TaxpayerType } from "@/lib/types";

function isTaxpayerType(value: string): value is TaxpayerType {
  return taxpayerTypes.some((item) => item === value);
}

function isDocumentKind(value: string): value is DocumentKind {
  return documentKinds.some((item) => item === value);
}

function sameName(left: string, right: string): boolean {
  return left.trim().toLowerCase().replace(/\s+/g, " ") === right.trim().toLowerCase().replace(/\s+/g, " ");
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

function revalidateReturn(profileId: string, returnId: string) {
  revalidatePath(`/returns/${profileId}/${returnId}`);
  revalidatePath("/returns");
  revalidatePath("/portal");
  revalidatePath("/portal/efile");
  revalidatePath("/inbox");
}

async function sendClerkInvite(email: string, role: "client" | "staff") {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const clerk = await clerkClient();
  await clerk.invitations.createInvitation({
    emailAddress: email,
    redirectUrl: `${protocol}://${host}/auth/continue`,
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

export async function saveProfile(formData: FormData) {
  const profile = await requireProfile("client");
  const taxpayerType = String(formData.get("taxpayerType") ?? "individual");
  if (!isTaxpayerType(taxpayerType)) {
    return;
  }
  const store = getStore();
  await store.updateProfile(profile.id, {
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    state: String(formData.get("state") ?? "").trim(),
    zip: String(formData.get("zip") ?? "").trim(),
    taxpayerType,
    spouseName: String(formData.get("spouseName") ?? "").trim(),
    taxYears: String(formData.get("taxYears") ?? "").trim(),
    taxId: String(formData.get("taxId") ?? "").trim() || undefined,
  });
  await store.addMessage({
    profileId: profile.id,
    authorId: profile.id,
    authorRole: "client",
    body: "Profile saved.",
    kind: "event",
  });
  revalidatePath("/portal");
  revalidatePath("/inbox");
  redirect("/portal");
}

export async function uploadDocument(formData: FormData) {
  const profile = await requireProfile("client");
  const kind = String(formData.get("kind") ?? "");
  const file = formData.get("file");
  if (!isDocumentKind(kind) || !(file instanceof File) || file.size === 0) {
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    return;
  }
  const store = getStore();
  await store.addDocument({
    profileId: profile.id,
    kind,
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    bytes: Buffer.from(await file.arrayBuffer()),
  });
  await store.addMessage({
    profileId: profile.id,
    authorId: profile.id,
    authorRole: "client",
    body: `Uploaded ${file.name}.`,
    kind: "event",
  });
  revalidatePath("/portal/documents");
  revalidatePath("/inbox");
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
  revalidatePath("/portal");
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
  await requireProfile("staff");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  if (!email.includes("@")) {
    return { error: "Enter an email address." };
  }
  const store = getStore();
  const teammate = await store.createStaff({ email, name });
  if (!teammate) {
    return { error: "That email already belongs to a client." };
  }
  const delivered = await deliverInvite(email, "staff");
  revalidatePath("/settings/teammates");
  return delivered;
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
  if (!body) {
    return;
  }
  const targetId = profile.role === "staff" ? clientId : profile.id;
  const requested = String(formData.get("kind") ?? "message");
  const kind = profile.role === "staff" && requested === "note" ? "note" : "message";
  const store = getStore();
  await store.addMessage({
    profileId: targetId,
    authorId: profile.id,
    authorRole: profile.role,
    body,
    kind,
  });
  revalidatePath("/inbox");
  revalidatePath("/portal");
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
  revalidatePath(`/contacts/${profileId}`);
  revalidatePath("/returns");
  revalidatePath("/portal");
}

export async function saveReturnWorkflow(id: string, revision: number, data: FormData) {
  await requireProfile("staff");
  const store = getStore();
  const stage = String(data.get("stage") ?? "");
  const owner = String(data.get("owner") ?? "") || null;
  const due = String(data.get("due") ?? "") || null;
  const nextAction = String(data.get("nextAction") ?? "").trim();
  const parsedDate = due && new Date(due + "T00:00:00Z");
  if (!Object.hasOwn(stages, stage) || nextAction.length > 500 ||
      (parsedDate && (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== due))) {
    throw new Error("Check the return stage, date, and handoff note.");
  }
  if (owner && (await store.getProfile(owner))?.role !== "staff") throw new Error("Choose a staff member.");
  const current = (await store.listTeamReturns()).find((row) => row.id === id);
  if (!current || current.revision !== revision) redirect("/returns?conflict=1");
  const resumeStage = stage === "waiting" ? (current.stage === "waiting" ? current.resumeStage : current.stage) : null;
  const saved = await store.updateWorkflow(id, { revision, stage: stage as Workflow["stage"], owner, due, nextAction, resumeStage });
  revalidatePath("/returns");
  if (!saved) redirect("/returns?conflict=1");
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
      const doc = await store.addDocument({profileId, kind:"other", filename:file.name,
        contentType:file.type || "application/octet-stream", bytes:Buffer.from(await file.arrayBuffer())});
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
  await syncRequestStage(profileId, previous.returnId);
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
  await requireProfile("staff");
  const jurisdiction = String(form.get("jurisdiction"));
  const status = String(form.get("status"));
  const note = String(form.get("note") ?? "").trim();
  const region = String(form.get("region") ?? "");
  if (!isFilingJurisdiction(jurisdiction) || !isFilingStatus(status) || note.length > 1000) throw new Error("Check the filing jurisdiction and status.");
  if (jurisdiction === "state" && !/^[A-Za-z]{2}$/.test(region.trim())) throw new Error("Enter the two-letter state.");
  const store = getStore();
  const item = (await store.listTeamReturns()).find((row) => row.id === returnId && row.profileId === profileId);
  if (!item) throw new Error("Return not found.");
  const saved = await store.saveFiling({ returnId, jurisdiction, region, status, note });
  if (status === "signature") await ensureAuthorizations(profileId, returnId, item.returnVersion);
  const messages = await store.listMessages(profileId);
  const derived = deriveStage(item, requestThreads(messages.filter((row) => row.returnId === returnId)));
  const forced = derived.stage === "waiting" || derived.nextAction.startsWith("Review:");
  await store.updateWorkflow(returnId, { ...item, ...(forced ? derived : { stage: "followup", resumeStage: item.resumeStage, nextAction: filingPrompt(saved) }) });
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
  if (fresh) await store.updateWorkflow(returnId, { ...fresh, stage: "followup", nextAction: "Collect Form 8879 before e-file" });
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
  if (fresh) await store.updateWorkflow(returnId, { ...fresh, stage: "followup", nextAction: "Collect Form 8879 before e-file" });
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
  revalidateReturn(profileId, returnId);
}
