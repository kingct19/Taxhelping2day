import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { getStore } from "@/lib/store";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await requireProfile();
  const { id } = await context.params;
  if (actor.role === "client" && actor.id !== id) {
    const returns = await getStore().listTeamReturns();
    const assigned = returns.some((item) => item.profileId === actor.id && item.owner === id);
    if (!assigned) return new NextResponse("Not found", { status: 404 });
  }
  const file = await getStore().readAvatar(id);
  if (!file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
