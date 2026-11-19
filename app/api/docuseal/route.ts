import { timingSafeEqual } from "node:crypto";
import { syncSubmission } from "@/lib/docuseal";

export async function POST(req: Request) {
  const actual = Buffer.from(req.headers.get("x-portal-secret") ?? "");
  const expected = Buffer.from(process.env.DOCUSEAL_WEBHOOK_SECRET ?? "");
  if (!expected.length || actual.length !== expected.length || !timingSafeEqual(expected, actual)) return new Response(null,{status:401});
  const event = await req.json();
  const id = event.data?.submission_id ?? event.data?.submission?.id ??
    (String(event.event_type).startsWith("submission.") ? event.data?.id : null);
  if (Number.isSafeInteger(id) && id > 0) await syncSubmission(id);
  return new Response(null,{status:204});
}
