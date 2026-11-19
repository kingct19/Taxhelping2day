import { NextResponse } from "next/server";
import { getStaffProfile } from "@/lib/auth";
import { pageStateDecisions } from "@/lib/authorities/read";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const staff = await getStaffProfile();
  if (!staff) return NextResponse.json({ error: "Sign in as staff to read a source." }, { status: 401 });
  const url = new URL(request.url);
  const name = url.searchParams.get("name") ?? "";
  const keyword = url.searchParams.get("q") ?? "";
  const page = Number(url.searchParams.get("page") ?? "0");
  try {
    const listed = await pageStateDecisions(name, keyword, Number.isFinite(page) ? page : 0);
    return NextResponse.json(listed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "That state list could not be read.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
