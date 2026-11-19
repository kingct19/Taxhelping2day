import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { getStore } from "@/lib/store";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  const { id } = await context.params;
  const file = await getStore().readDocument(id);
  if (!file || (profile.role === "client" && file.record.profileId !== profile.id)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const preview = new URL(request.url).searchParams.get("preview") === "1";
  const filename = file.record.filename.replaceAll('"', "");
  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.record.contentType,
      "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="${filename}"`,
    },
  });
}
