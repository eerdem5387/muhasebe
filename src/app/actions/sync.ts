"use server";

import { revalidatePath } from "next/cache";
import { requireOperations } from "@/lib/context";
import { toErrorMessage } from "@/lib/errors";
import { runSchoolSync } from "@/server/school-sync";
import type { ActionState } from "./types";

export async function runSchoolSyncAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    const ctx = await requireOperations();
    const result = await runSchoolSync(ctx.tenantId);
    revalidatePath("/students");
    revalidatePath("/income");
    revalidatePath("/collections");
    revalidatePath("/settings");
    if (!result.ok) return { error: result.error ?? "Senkronizasyon başarısız." };
    return {
      success: `${result.studentsUpserted} öğrenci ve ${result.enrollmentsUpserted} kayıt güncellendi.`,
    };
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
}
