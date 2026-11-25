"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { officeHoursError, parseOfficeHours, type OfficeHours } from "@/lib/office-hours";
import { getStore } from "@/lib/store";

export async function saveOfficeHoursAction(input: OfficeHours): Promise<{ error: string | null }> {
  await requireProfile("staff");
  const hours = parseOfficeHours(input);
  if (!hours) return { error: "Could not read those hours." };
  const error = officeHoursError(hours);
  if (error) return { error };
  await getStore().saveOfficeHours(hours);
  revalidatePath("/settings/office-hours");
  revalidatePath("/portal");
  revalidatePath("/portal/messages");
  revalidatePath("/portal/settings");
  return { error: null };
}
