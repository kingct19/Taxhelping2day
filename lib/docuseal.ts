import "server-only";
import { createClient } from "@supabase/supabase-js";

export function packetDb() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}}) : null;
}

export function signingConfigured() {
  return Boolean(process.env.DOCUSEAL_API_KEY && Number(process.env.DOCUSEAL_ENGAGEMENT_TEMPLATE_ID) > 0 &&
    process.env.DOCUSEAL_SIGNER_ROLE && process.env.DOCUSEAL_WEBHOOK_SECRET && packetDb());
}

export async function signingApi(path: string, body?: unknown) {
  const response = await fetch("https://api.docuseal.com" + path, {
    method: body ? "POST" : "GET", cache:"no-store", redirect:"error",
    headers:{"X-Auth-Token":process.env.DOCUSEAL_API_KEY!, "Content-Type":"application/json"},
    body:body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error("DocuSeal did not confirm the request.");
  return response.json();
}

type Submission = {
  id: number; status: string;
  submitters: {email:string; status:string; external_id?:string}[];
  documents: {name:string;url:string}[]; audit_log_url?:string;
};

export async function syncSubmission(submissionId: number) {
  const db = packetDb();
  if (!db) throw new Error("Signing storage unavailable.");
  const submission: Submission = await signingApi(`/submissions/${submissionId}`);
  const key = submission.submitters.find(person => person.external_id)?.external_id;
  if (submission.id !== submissionId || !key || !/^[0-9a-f-]{36}$/i.test(key)) return;
  const {data:packet,error} = await db.from("signing_packets").select("*").eq("id",key).maybeSingle();
  if (error) throw error;
  if (!packet || packet.status === "completed" || (packet.submission_id && packet.submission_id !== submissionId)) return;
  if (!submission.submitters.some(p => p.external_id === key && p.email.toLowerCase() === packet.recipient.toLowerCase())) return;
  const files: {name:string;path:string}[] = [];
  if (submission.status === "completed") {
    if (!submission.documents?.length) throw new Error("Signed packet is not yet available.");
    const sources = [...submission.documents];
    if (submission.audit_log_url) sources.push({name:"Signature audit log",url:submission.audit_log_url});
    for (const [i, source] of sources.entries()) {
      const url = new URL(source.url);
      if (url.protocol !== "https:" || !(url.hostname === "docuseal.com" || url.hostname.endsWith(".docuseal.com"))) throw new Error("Unexpected signing file host.");
      const pdf = await fetch(url, {cache:"no-store"});
      if (!pdf.ok) throw new Error("Signed file unavailable.");
      const bytes = Buffer.from(await pdf.arrayBuffer());
      if (bytes.subarray(0,5).toString() !== "%PDF-") throw new Error("Expected a PDF.");
      const path = `packets/${packet.id}/${i}.pdf`;
      const result = await db.storage.from("portal-files").upload(path, bytes, {contentType:"application/pdf",upsert:true});
      if (result.error) throw result.error;
      files.push({path,name:source.name});
    }
  }
  const updated = await db.from("signing_packets").update({submission_id:submissionId,status:submission.status,files,
    signer_states:submission.submitters.map(({email,status})=>({email,status}))}).eq("id",key).neq("status","completed");
  if (updated.error) throw updated.error;
}
