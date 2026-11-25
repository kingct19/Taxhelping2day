"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { parseSignInMethods, signInMethodsError, type SignInMethods } from "@/lib/sign-in-methods";
import { getStore } from "@/lib/store";

export async function saveSignInMethodsAction(input: SignInMethods): Promise<{ error: string | null }> {
  await requireProfile("staff");
  const methods = parseSignInMethods(input);
  if (!methods) return { error: "Could not read those sign-in methods." };
  const error = signInMethodsError(methods);
  if (error) return { error };
  await getStore().saveSignInMethods(methods);
  revalidatePath("/settings/security");
  revalidatePath("/sign-in");
  revalidatePath("/settings/teammates");
  revalidatePath("/contacts");
  return { error: null };
}
