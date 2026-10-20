"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  canOverrideContractAmounts,
  requireOperations,
} from "@/lib/context";
import {
  incomePlanCategorySchema,
  incomePlanPaymentLineSchema,
  incomePlanSchema,
} from "@/lib/validation";
import { toErrorMessage } from "@/lib/errors";
import {
  buildPlanSchedule,
  isEcommerceEligibleCategory,
  isEcomChannel,
  resolveEcomPlanRules,
  scheduleStatus,
} from "@/server/income-schedule";
import type { ActionState } from "./types";
import type { PaymentChannel } from "@prisma/client";

function revalidateIncome() {
  revalidatePath("/collections");
  revalidatePath("/students");
  revalidatePath("/monthly");
  revalidatePath("/planned-income");
}

const DEFAULT_CATEGORIES: Array<{ name: string; requiresStudent: boolean }> = [
  { name: "Öğrenci geliri", requiresStudent: true },
  { name: "Kitap geliri", requiresStudent: false },
  { name: "Araç servis geliri", requiresStudent: false },
];

export async function ensureDefaultIncomePlanCategories(
  tenantId: string,
  // Tenant-scoped Prisma client (extended)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: { incomePlanCategory: any },
) {
  const existing = await db.incomePlanCategory.findMany({
    where: { tenantId },
    select: { id: true },
    take: 1,
  });
  if (existing.length > 0) return;
  await db.incomePlanCategory.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({
      tenantId,
      name: c.name,
      requiresStudent: c.requiresStudent,
    })),
    skipDuplicates: true,
  });
}

export async function createIncomePlanCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = incomePlanCategorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  try {
    const ctx = await requireOperations();
    await ctx.db.incomePlanCategory.create({
      data: {
        tenantId: ctx.tenantId,
        name: parsed.data.name,
        requiresStudent: Boolean(parsed.data.requiresStudent),
      },
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  revalidateIncome();
  return { success: "Gelir kalemi eklendi." };
}

type ParsedPayment = {
  paymentChannel: PaymentChannel;
  amount: Prisma.Decimal;
  installmentCount: number;
  blockDays: number;
  bankName: string | null;
};

function parsePayments(rawJson: string): ParsedPayment[] | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(rawJson);
  } catch {
    return { error: "Ödeme listesi geçersiz." };
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: "En az bir ödeme yöntemi ekleyin." };
  }
  const out: ParsedPayment[] = [];
  for (let i = 0; i < raw.length; i++) {
    const line = incomePlanPaymentLineSchema.safeParse(raw[i]);
    if (!line.success) {
      return { error: `Ödeme #${i + 1}: ${line.error.issues[0]?.message ?? "geçersiz"}` };
    }
    let paymentChannel = line.data.paymentChannel as PaymentChannel;
    let installmentCount = line.data.installmentCount;
    let blockDays = line.data.blockDays;
    let bankName = line.data.bankName?.trim() || null;
    if (isEcomChannel(paymentChannel)) {
      const rules = resolveEcomPlanRules(paymentChannel);
      installmentCount = rules.installmentCount;
      blockDays = rules.blockDays;
      bankName = rules.bankName;
    }
    out.push({
      paymentChannel,
      amount: new Prisma.Decimal(line.data.amount),
      installmentCount,
      blockDays,
      bankName,
    });
  }
  return out;
}

export async function createIncomePlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = incomePlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  const data = parsed.data;

  try {
    const ctx = await requireOperations();
    const category = await ctx.db.incomePlanCategory.findFirst({
      where: { id: data.categoryId, active: true },
    });
    if (!category) return { error: "Gelir kalemi bulunamadı." };

    const paymentsResult = parsePayments(data.paymentsJson);
    if ("error" in paymentsResult) return { error: paymentsResult.error };
    const payments = paymentsResult;

    let targetAmount = new Prisma.Decimal(data.amount);
    let enrollmentId: string | null = data.enrollmentId || null;
    const planDate = new Date(`${data.planDate}T12:00:00`);
    const ecomOk = isEcommerceEligibleCategory(category.name);

    for (const pay of payments) {
      if (isEcomChannel(pay.paymentChannel) && !ecomOk) {
        return { error: "E-ticaret kanalları yalnızca Kitap / Araç servis geliri için kullanılabilir." };
      }
      if (pay.amount.lte(0)) return { error: "Her ödeme tutarı 0’dan büyük olmalı." };
    }

    const paymentsSum = payments.reduce((s, p) => s.plus(p.amount), new Prisma.Decimal(0));

    if (category.requiresStudent) {
      if (!enrollmentId) return { error: "Öğrenci geliri için öğrenci seçin." };
      if (payments.some((p) => isEcomChannel(p.paymentChannel))) {
        return { error: "Öğrenci gelirinde e-ticaret kanalı kullanılamaz." };
      }
      const enrollment = await ctx.db.enrollment.findFirst({
        where: { id: enrollmentId, status: "ACTIVE" },
        include: { student: { select: { fullName: true } } },
      });
      if (!enrollment) return { error: "Öğrenci kaydı bulunamadı." };

      const contractFee = new Prisma.Decimal(enrollment.annualFee);
      if (!canOverrideContractAmounts(ctx.isSuperAdmin)) {
        targetAmount = contractFee;
      } else if (targetAmount.lte(0)) {
        targetAmount = contractFee;
      }

      if (paymentsSum.minus(targetAmount).abs().gt(0.05)) {
        return {
          error: `Ödeme tutarları toplamı (${paymentsSum.toFixed(2)}) plan tutarına (${targetAmount.toFixed(2)}) eşit olmalı.`,
        };
      }

      const primary = [...payments].sort((a, b) => Number(b.amount.minus(a.amount)))[0]!;
      await ctx.db.enrollment.update({
        where: { id: enrollment.id },
        data: {
          paymentChannel: primary.paymentChannel,
          installmentCount: primary.installmentCount,
        },
      });

      await ctx.db.incomeScheduleLine.deleteMany({ where: { enrollmentId: enrollment.id } });
      let scheduleIndex = 1;
      const scheduleRows: Array<{
        tenantId: string;
        enrollmentId: string;
        installmentIndex: number;
        amount: Prisma.Decimal;
        releaseDate: Date;
        yearMonth: string;
        status: ReturnType<typeof scheduleStatus>;
        plannedChannel: PaymentChannel;
      }> = [];
      for (const pay of payments) {
        const drafts = buildPlanSchedule({
          amount: pay.amount,
          paymentDate: planDate,
          paymentChannel: pay.paymentChannel,
          installmentCount: pay.installmentCount,
          blockDays: pay.blockDays,
        });
        for (const line of drafts) {
          scheduleRows.push({
            tenantId: ctx.tenantId,
            enrollmentId: enrollment.id,
            installmentIndex: scheduleIndex++,
            amount: line.amount,
            releaseDate: line.releaseDate,
            yearMonth: line.yearMonth,
            status: scheduleStatus(line.releaseDate, false),
            plannedChannel: pay.paymentChannel,
          });
        }
      }
      if (scheduleRows.length) {
        await ctx.db.incomeScheduleLine.createMany({ data: scheduleRows });
      }
    } else {
      enrollmentId = null;
      if (targetAmount.lte(0)) targetAmount = paymentsSum;
      if (paymentsSum.lte(0)) return { error: "Tutar 0’dan büyük olmalı." };
      if (paymentsSum.minus(targetAmount).abs().gt(0.05)) {
        return {
          error: `Ödeme tutarları toplamı (${paymentsSum.toFixed(2)}) plan tutarına (${targetAmount.toFixed(2)}) eşit olmalı.`,
        };
      }
    }

    for (const pay of payments) {
      const drafts = buildPlanSchedule({
        amount: pay.amount,
        paymentDate: planDate,
        paymentChannel: pay.paymentChannel,
        installmentCount: pay.installmentCount,
        blockDays: pay.blockDays,
      });

      await ctx.db.incomePlan.create({
        data: {
          tenantId: ctx.tenantId,
          categoryId: category.id,
          enrollmentId,
          amount: pay.amount,
          paymentChannel: pay.paymentChannel,
          installmentCount: pay.installmentCount,
          blockDays: pay.blockDays,
          bankName: pay.bankName,
          planDate,
          notes: data.notes || null,
          createdById: ctx.userId,
          lines: {
            create: drafts.map((line) => ({
              tenantId: ctx.tenantId,
              installmentIndex: line.installmentIndex,
              amount: line.amount,
              releaseDate: line.releaseDate,
              yearMonth: line.yearMonth,
              status: scheduleStatus(line.releaseDate, false),
            })),
          },
        },
      });
    }

    revalidateIncome();
    return {
      success:
        payments.length > 1
          ? `${payments.length} ödeme yöntemiyle gelir planı oluşturuldu.`
          : "Gelir planı oluşturuldu.",
    };
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
}
