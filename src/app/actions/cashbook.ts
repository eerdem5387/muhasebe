"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireOperations } from "@/lib/context";
import { cashbookExpenseSchema, cashbookIncomeSchema } from "@/lib/validation";
import { toErrorMessage } from "@/lib/errors";
import { pushFinanceEventToOkul, serializeCashbookEntry } from "@/server/okul-webhook";
import type { ActionState } from "./types";

function revalidateMonth(yearMonth: string) {
  revalidatePath("/monthly");
  revalidatePath(`/monthly?month=${yearMonth}`);
}

function yearMonthFromDate(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export async function createCashbookIncomeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = cashbookIncomeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  const data = parsed.data;

  try {
    const ctx = await requireOperations();
    const yearMonth = data.yearMonth || yearMonthFromDate(data.occurredAt);
    const created = await ctx.db.cashbookEntry.create({
      data: {
        tenantId: ctx.tenantId,
        side: "INCOME",
        yearMonth,
        amount: new Prisma.Decimal(data.amount),
        occurredAt: new Date(`${data.occurredAt}T12:00:00`),
        channel: data.channel,
        bankName: data.bankName?.trim() || null,
        checkInstallments:
          data.channel === "CHECK" ? Number(data.checkInstallments) : null,
        incomeCategory: data.incomeCategory,
        payerFirstName: data.payerFirstName,
        payerLastName: data.payerLastName,
        payerIdentityNo: data.payerIdentityNo,
        notes: data.notes || null,
      },
    });
    await pushFinanceEventToOkul(
      "cashbook_entry.upserted",
      ctx.tenantId,
      serializeCashbookEntry(created),
    );
    revalidateMonth(yearMonth);
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  return { success: "Gelir kaydı eklendi." };
}

export async function createCashbookExpenseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = cashbookExpenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  const data = parsed.data;

  try {
    const ctx = await requireOperations();
    const yearMonth = data.yearMonth || yearMonthFromDate(data.occurredAt);
    const created = await ctx.db.cashbookEntry.create({
      data: {
        tenantId: ctx.tenantId,
        side: "EXPENSE",
        yearMonth,
        amount: new Prisma.Decimal(data.amount),
        occurredAt: new Date(`${data.occurredAt}T12:00:00`),
        channel: data.channel,
        bankName: data.bankName?.trim() || null,
        checkInstallments:
          data.channel === "CHECK" ? Number(data.checkInstallments) : null,
        expenseTitle: data.expenseTitle,
        payeeIdentityNo: data.payeeIdentityNo,
        invoiceNo: data.invoiceNo,
        notes: data.notes || null,
      },
    });
    await pushFinanceEventToOkul(
      "cashbook_entry.upserted",
      ctx.tenantId,
      serializeCashbookEntry(created),
    );
    revalidateMonth(yearMonth);
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  return { success: "Gider kaydı eklendi." };
}

export async function deleteCashbookEntryAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const yearMonth = String(formData.get("yearMonth") ?? "");
  const ctx = await requireOperations();
  await ctx.db.cashbookEntry.deleteMany({ where: { id } });
  await pushFinanceEventToOkul("cashbook_entry.deleted", ctx.tenantId, { id });
  if (yearMonth) revalidateMonth(yearMonth);
  else revalidatePath("/monthly");
}
