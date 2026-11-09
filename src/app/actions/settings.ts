"use server";

import { revalidatePath } from "next/cache";
import { requireSettings } from "@/lib/context";
import { bankAccountSchema, cardBankSchema, categorySchema } from "@/lib/validation";
import { toErrorMessage } from "@/lib/errors";
import type { ActionState } from "./types";

function revalidateFinanceSettings() {
  revalidatePath("/settings");
  revalidatePath("/monthly");
}

export async function createCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  try {
    const ctx = await requireSettings();
    await ctx.db.ledgerCategory.create({
      data: { tenantId: ctx.tenantId, type: parsed.data.type, name: parsed.data.name },
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  revalidateFinanceSettings();
  return { success: "Kalem eklendi." };
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const ctx = await requireSettings();
  const id = String(formData.get("id") ?? "");
  if (id) await ctx.db.ledgerCategory.deleteMany({ where: { id } });
  revalidateFinanceSettings();
}

export async function createCardBankAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = cardBankSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  try {
    const ctx = await requireSettings();
    await ctx.db.cardBankSetting.create({
      data: {
        tenantId: ctx.tenantId,
        bankName: parsed.data.bankName,
        blockDays: parsed.data.blockDays,
      },
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  revalidateFinanceSettings();
  return { success: "Kredi kartı eklendi." };
}

export async function deleteCardBankAction(formData: FormData): Promise<void> {
  const ctx = await requireSettings();
  const id = String(formData.get("id") ?? "");
  if (id) await ctx.db.cardBankSetting.deleteMany({ where: { id } });
  revalidateFinanceSettings();
}

export async function createBankAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = bankAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  try {
    const ctx = await requireSettings();
    await ctx.db.bankAccountSetting.create({
      data: {
        tenantId: ctx.tenantId,
        name: parsed.data.name,
      },
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  revalidateFinanceSettings();
  return { success: "Banka hesabı eklendi." };
}

export async function deleteBankAccountAction(formData: FormData): Promise<void> {
  const ctx = await requireSettings();
  const id = String(formData.get("id") ?? "");
  if (id) await ctx.db.bankAccountSetting.deleteMany({ where: { id } });
  revalidateFinanceSettings();
}
