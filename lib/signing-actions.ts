"use server";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { packetDb, signingApi, signingConfigured } from "@/lib/docuseal";
import { getStore } from "@/lib/store";

export async function sendEngagement(profileId:string, returnId:string) {
  await requireProfile("staff");
  const db = packetDb();
  if (!db || !signingConfigured()) throw new Error("Configure the approved engagement template first.");
  const store = getStore();
  const [client, returns] = await Promise.all([store.getProfile(profileId),store.listReturns(profileId)]);
  const item = returns.find(row=>row.id === returnId);
  if (!item || client?.role !== "client") throw new Error("Return unavailable.");
  const template = Number(process.env.DOCUSEAL_ENGAGEMENT_TEMPLATE_ID);
  const {data:packet,error} = await db.from("signing_packets").insert({return_id:returnId,template_id:template,recipient:client.email}).select("id").single();
  if (error?.code === "23505") return;
  if (error) throw error;
  try {
    const signers = await signingApi("/submissions",{template_id:template,send_email:true,
      submitters:[{role:process.env.DOCUSEAL_SIGNER_ROLE,name:client.name,email:client.email,external_id:packet.id,
        values:{"Taxpayer name":item.entity,"Tax year":String(item.taxYear)}}]});
    const id = signers[0]?.submission_id;
    if (!Number.isSafeInteger(id)) throw new Error("Unconfirmed submission.");
    const update = await db.from("signing_packets").update({submission_id:id,status:"pending"}).eq("id",packet.id).eq("status","creating");
    if (update.error) throw update.error;
  } catch {
    const result = await db.from("signing_packets").update({status:"Verify in DocuSeal"}).eq("id",packet.id).eq("status","creating");
    if (result.error) throw result.error;
  }
  revalidatePath(`/returns/${profileId}/${returnId}`);
}
