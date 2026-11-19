import {requireProfile} from "@/lib/auth";
import {packetDb} from "@/lib/docuseal";
export async function GET(_:Request,{params}:{params:Promise<{id:string;index:string}>}) {
  const viewer = await requireProfile();
  const {id,index} = await params;
  const db = packetDb();
  if (!db || !/^\d+$/.test(index)) return new Response(null,{status:404});
  const {data} = await db.from("signing_packets").select("files,tax_returns!inner(profile_id)").eq("id",id).maybeSingle();
  const owner = Array.isArray(data?.tax_returns) ? data?.tax_returns[0] : data?.tax_returns;
  if (viewer.role === "client" && owner?.profile_id !== viewer.id) return new Response(null,{status:404});
  const file = data?.files?.[Number(index)];
  if (!file) return new Response(null,{status:404});
  const pdf = await db.storage.from("portal-files").download(file.path);
  if (!pdf.data) return new Response(null,{status:404});
  return new Response(pdf.data,{headers:{"Content-Type":"application/pdf","Content-Disposition":"attachment","Cache-Control":"private, no-store"}});
}
