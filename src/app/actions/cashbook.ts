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

function splitFullName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "—", last: "—" };
  if (parts.length === 1) return { first: parts[0]!, last: "—" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1]! };
}

type PaymentLine = {
  channel: "BANK" | "CHECK" | "CREDIT_CARD" | "CASH" | "PROMISSORY";
  bankName?: string | null;
  checkInstallments?: string | null;
  amount: string;
  occurredAt: string;
};

export async function createCashbookIncomeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = cashbookIncomeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  const data = parsed.data;

  let payments: PaymentLine[];
  try {
    payments = JSON.parse(data.paymentsJson) as PaymentLine[];
  } catch {
    return { error: "Ödeme satırları okunamadı." };
  }
  if (!Array.isArray(payments) || payments.length === 0) {
    return { error: "En az bir ödeme satırı ekleyin." };
  }

  try {
    const ctx = await requireOperations();

    let payerFirstName = data.payerFirstName?.trim() || "";
    let payerLastName = data.payerLastName?.trim() || "";

    if (data.incomeCategory === "STUDENT") {
      const student = await ctx.db.student.findFirst({
        where: { id: data.studentId },
        select: { fullName: true },
      });
      if (!student) return { error: "Öğrenci bulunamadı." };
      const parts = splitFullName(student.fullName);
      payerFirstName = parts.first;
      payerLastName = parts.last;
    }

    const months = new Set<string>();
    for (const pay of payments) {
      const yearMonth = data.yearMonth || yearMonthFromDate(pay.occurredAt);
      months.add(yearMonth);
      const created = await ctx.db.cashbookEntry.create({
        data: {
          tenantId: ctx.tenantId,
          side: "INCOME",
          yearMonth,
          amount: new Prisma.Decimal(pay.amount),
          occurredAt: new Date(`${pay.occurredAt}T12:00:00`),
          channel: pay.channel,
          bankName: pay.bankName?.trim() || null,
          checkInstallments:
            pay.channel === "CHECK" && pay.checkInstallments
              ? Number(pay.checkInstallments)
              : null,
          incomeCategory: data.incomeCategory,
          payerFirstName,
          payerLastName,
          payerIdentityNo: null,
          notes: data.notes || null,
        },
      });
      await pushFinanceEventToOkul(
        "cashbook_entry.upserted",
        ctx.tenantId,
        serializeCashbookEntry(created),
      );
    }
    for (const ym of months) revalidateMonth(ym);
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  return {
    success:
      payments.length > 1
        ? `${payments.length} ödeme satırı kaydedildi.`
        : "Gelir kaydı eklendi.",
  };
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
    const noteParts = [
      data.requesterName ? `Talep eden: ${data.requesterName.trim()}` : null,
      data.notes?.trim() || null,
    ].filter(Boolean);

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
        payeeIdentityNo: data.payeeIdentityNo?.trim() || null,
        invoiceNo: data.invoiceNo?.trim() || null,
        notes: noteParts.length ? noteParts.join(" · ") : null,
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
  const id = String(formData.get("id") ?? "").trim();
  const yearMonth = String(formData.get("yearMonth") ?? "").trim();
  if (!id || id.includes(":")) return; // plan:… gibi sanal satırlar silinmez

  const ctx = await requireOperations();
  const deleted = await ctx.db.cashbookEntry.deleteMany({ where: { id } });
  if (deleted.count === 0) return;

  await pushFinanceEventToOkul("cashbook_entry.deleted", ctx.tenantId, { id });
  revalidatePath("/monthly");
  if (yearMonth) revalidateMonth(yearMonth);
}
