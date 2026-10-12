"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  canOverrideContractAmounts,
  requireOperations,
} from "@/lib/context";
import { incomePlanCategorySchema, incomePlanSchema } from "@/lib/validation";
import { toErrorMessage } from "@/lib/errors";
import { buildIncomeSchedule, scheduleStatus } from "@/server/income-schedule";
import type { ActionState } from "./types";

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

    let amount = new Prisma.Decimal(data.amount);
    let enrollmentId: string | null = data.enrollmentId || null;

    if (category.requiresStudent) {
      if (!enrollmentId) return { error: "Öğrenci geliri için öğrenci seçin." };
      const enrollment = await ctx.db.enrollment.findFirst({
        where: { id: enrollmentId, status: "ACTIVE" },
        include: { student: { select: { fullName: true } } },
      });
      if (!enrollment) return { error: "Öğrenci kaydı bulunamadı." };

      const contractFee = new Prisma.Decimal(enrollment.annualFee);
      if (!canOverrideContractAmounts(ctx.isSuperAdmin)) {
        amount = contractFee;
      } else if (amount.lte(0)) {
        amount = contractFee;
      }

      await ctx.db.enrollment.update({
        where: { id: enrollment.id },
        data: {
          paymentChannel: data.paymentChannel,
          installmentCount: data.installmentCount,
        },
      });

      // Enrollment schedule (öğrenci detay / eski plan uyumu)
      await ctx.db.incomeScheduleLine.deleteMany({ where: { enrollmentId: enrollment.id } });
      const enrollmentDrafts = buildIncomeSchedule({
        annualFee: amount,
        installmentCount: data.installmentCount,
        paymentDate: new Date(`${data.planDate}T12:00:00`),
        blockDays: data.blockDays,
      });
      await ctx.db.incomeScheduleLine.createMany({
        data: enrollmentDrafts.map((line) => ({
          tenantId: ctx.tenantId,
          enrollmentId: enrollment.id,
          installmentIndex: line.installmentIndex,
          amount: line.amount,
          releaseDate: line.releaseDate,
          yearMonth: line.yearMonth,
          status: scheduleStatus(line.releaseDate, false),
          plannedChannel: data.paymentChannel,
        })),
      });
    } else {
      enrollmentId = null;
      if (amount.lte(0)) return { error: "Tutar 0’dan büyük olmalı." };
    }

    const drafts = buildIncomeSchedule({
      annualFee: amount,
      installmentCount: data.installmentCount,
      paymentDate: new Date(`${data.planDate}T12:00:00`),
      blockDays: data.blockDays,
    });

    await ctx.db.incomePlan.create({
      data: {
        tenantId: ctx.tenantId,
        categoryId: category.id,
        enrollmentId,
        amount,
        paymentChannel: data.paymentChannel,
        installmentCount: data.installmentCount,
        blockDays: data.blockDays,
        bankName: data.bankName?.trim() || null,
        planDate: new Date(`${data.planDate}T12:00:00`),
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
  } catch (err) {
    return { error: toErrorMessage(err) };
  }

  revalidateIncome();
  return { success: "Gelir planı oluşturuldu." };
}
