import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { staffEmails } from "@/lib/firm";
import { getStore } from "@/lib/store";
import type { Profile } from "@/lib/types";

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
  const staffAllowed = staffEmails().includes(email) || (await store.isStaffAllowed(email));
  if (!profile || (profile.role === "staff" && !staffAllowed)) {
    redirect("/not-on-file");
  }
  if (role && profile.role !== role) {
    redirect(profile.role === "staff" ? "/inbox" : "/portal");
  }
  return profile;
}
