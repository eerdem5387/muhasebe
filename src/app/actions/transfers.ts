"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/context";
import { transferSchema } from "@/lib/validation";
import { toErrorMessage } from "@/lib/errors";
import { createIntercompanyTransfer } from "@/server/accounting/intercompany";
import type { ActionState } from "./types";

export async function createTransferAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = transferSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };

  try {
    const ctx = await requireAuth();
    await createIntercompanyTransfer({
      tenantId: ctx.tenantId,
      fromCompanyId: parsed.data.fromCompanyId,
      toCompanyId: parsed.data.toCompanyId,
      fromAccountId: parsed.data.fromAccountId,
      toAccountId: parsed.data.toAccountId,
      amount: parsed.data.amount,
      date: new Date(parsed.data.date),
      description: parsed.data.description || null,
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }

  revalidatePath("/transfers");
  revalidatePath("/journal");
  redirect("/transfers");
}
