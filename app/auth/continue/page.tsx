import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ContinuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const ticket = params.__clerk_ticket;
  if (typeof ticket === "string" && ticket.length > 0) {
    const next = new URLSearchParams();
    next.set("__clerk_ticket", ticket);
    const status = params.__clerk_status;
    if (typeof status === "string") next.set("__clerk_status", status);
    redirect(`/sign-up?${next.toString()}`);
  }
  const profile = await requireProfile();
  redirect(profile.role === "staff" ? "/inbox" : "/portal");
}
