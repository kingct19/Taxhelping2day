import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { runAccepted } from "@/lib/automation-run";
import { staffEmails } from "@/lib/firm";
import { staffMayEnter } from "@/lib/teammates";
import { getStore } from "@/lib/store";
import type { Profile } from "@/lib/types";

export async function getStaffProfile(): Promise<Profile | null> {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) return null;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress.toLowerCase();
  if (!email) return null;
  const store = getStore();
  await store.ensureStaff();
  const profile = await store.getProfileByEmail(email);
  if (!profile || profile.role !== "staff") return null;
  const listed = staffEmails().includes(email) || (await store.isStaffAllowed(email));
  if (!staffMayEnter(profile, listed)) return null;
  return profile;
}

export async function requireProfile(role?: Profile["role"]): Promise<Profile> {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    redirect("/sign-in");
  }
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress.toLowerCase();
  if (!email) {
    redirect("/sign-in");
  }
  const store = getStore();
  await store.ensureStaff();
  const profile = await store.getProfileByEmail(email);
  const listed = staffEmails().includes(email) || (await store.isStaffAllowed(email));
  if (!profile || (profile.role === "staff" && !staffMayEnter(profile, listed))) {
    redirect("/not-on-file");
  }
  if (role && profile.role !== role) {
    redirect(profile.role === "staff" ? "/dashboard" : "/portal");
  }
  if (profile.role === "client" && !profile.portalAcceptedAt) {
    const first = await store.markPortalAccepted(profile.id);
    if (first) await runAccepted(profile.id, false);
  }
  return profile;
}
