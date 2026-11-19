import { NextResponse } from "next/server";
import { getStaffProfile } from "@/lib/auth";
import { pageTaxCourtOrders, searchLiveShelf, type LiveShelf } from "@/lib/authorities/read";

export const dynamic = "force-dynamic";

function liveKind(value: string): LiveShelf {
  switch (value) {
    case "opinions":
    case "orders":
    case "federal":
      return value;
    default:
      return "opinions";
  }
}

export async function GET(request: Request) {
  const staff = await getStaffProfile();
  if (!staff) return NextResponse.json({ error: "Sign in as staff to read opinions." }, { status: 401 });
  const url = new URL(request.url);
  const keyword = url.searchParams.get("q") ?? "";
  const kind = liveKind(url.searchParams.get("kind") ?? "opinions");
  const page = Number(url.searchParams.get("page") ?? "0");
  try {
    if (kind === "orders") {
      const listed = await pageTaxCourtOrders(keyword, Number.isFinite(page) ? page : 0);
      return NextResponse.json(listed);
    }
    const items = await searchLiveShelf(kind, keyword);
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The Tax Court opinion list could not be read.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
