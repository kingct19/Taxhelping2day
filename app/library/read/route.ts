import { NextResponse } from "next/server";
import { getStaffProfile } from "@/lib/auth";
import { readFederalOpinion, readLinkedSource, readTaxCourtOpinion } from "@/lib/authorities/read";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const staff = await getStaffProfile();
  if (!staff) return NextResponse.json({ error: "Sign in as staff to read a source." }, { status: 401 });
  const url = new URL(request.url);
  const href = url.searchParams.get("href") || url.searchParams.get("opinion") || "";
  try {
    const document = href.startsWith("opinion:")
      ? await readTaxCourtOpinion(href)
      : href.startsWith("federal:")
        ? await readFederalOpinion(href)
        : await readLinkedSource(href);
    return NextResponse.json(document);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The source could not be copied in.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
