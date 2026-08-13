"use server";

import { revalidatePath } from "next/cache";
import { requireCompany } from "@/lib/context";
import { toErrorMessage } from "@/lib/errors";
import { recordExpense, recordIncome, PaymentChannel } from "@/server/accounting/vouchers";
import type { ActionState } from "./types";

function num(v: FormDataEntryValue | null): string {
  return String(v ?? "").replace(",", ".");
}

export async function recordExpenseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const expenseAccountId = String(formData.get("expenseAccountId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  const via = String(formData.get("via") ?? "CASH") as PaymentChannel;
  const netAmount = num(formData.get("netAmount"));
  const taxRate = num(formData.get("taxRate")) || "0";
  const date = String(formData.get("date") ?? "");
  const description = String(formData.get("description") ?? "");

  if (!expenseAccountId) return { error: "Gider hesabı seçin." };
  if (!date) return { error: "Tarih gerekli." };
  if (!netAmount || Number.isNaN(Number(netAmount))) return { error: "Geçerli tutar girin." };

  try {
    const ctx = await requireCompany();
    await recordExpense({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      expenseAccountId,
      contactId: contactId || null,
      netAmount,
      taxRate,
      via,
      date: new Date(date),
      description: description || null,
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }

  revalidatePath("/expenses");
  revalidatePath("/journal");
  return { success: "Gider fişi kaydedildi." };
}

export async function recordIncomeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const incomeAccountId = String(formData.get("incomeAccountId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  const via = String(formData.get("via") ?? "CASH") as PaymentChannel;
  const netAmount = num(formData.get("netAmount"));
  const taxRate = num(formData.get("taxRate")) || "0";
  const date = String(formData.get("date") ?? "");
  const description = String(formData.get("description") ?? "");

  if (!incomeAccountId) return { error: "Gelir hesabı seçin." };
  if (!date) return { error: "Tarih gerekli." };
  if (!netAmount || Number.isNaN(Number(netAmount))) return { error: "Geçerli tutar girin." };

  try {
    const ctx = await requireCompany();
    await recordIncome({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      incomeAccountId,
      contactId: contactId || null,
      netAmount,
      taxRate,
      via,
      date: new Date(date),
      description: description || null,
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }

  revalidatePath("/expenses");
  revalidatePath("/journal");
  return { success: "Gelir fişi kaydedildi." };
}
