import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { getStore } from "@/lib/store";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  const { id } = await context.params;
  const file = await getStore().readSignature(id);
  if (!file || (profile.role === "client" && file.record.profileId !== profile.id)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const preview = new URL(request.url).searchParams.get("preview") === "1";
  const name = file.record.kind === "poa" ? "form-2848.pdf" : "engagement-letter.pdf";
  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="${name}"`,
    },
  });
}
