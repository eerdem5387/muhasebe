"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireOperations } from "@/lib/context";
import { enrollmentSchema, studentSchema } from "@/lib/validation";
import { toErrorMessage } from "@/lib/errors";
import { buildIncomeSchedule, scheduleStatus } from "@/server/income-schedule";
import type { ActionState } from "./types";

export async function createStudentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = studentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  try {
    const ctx = await requireOperations();
    await ctx.db.student.create({
      data: {
        tenantId: ctx.tenantId,
        fullName: parsed.data.fullName,
        classroom: parsed.data.classroom || null,
        parentPhone: parsed.data.parentPhone || null,
        notes: parsed.data.notes || null,
      },
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  revalidatePath("/students");
  return { success: "Öğrenci eklendi." };
}

export async function createEnrollmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = enrollmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  const data = parsed.data;

  if (data.paymentChannel === "CREDIT_CARD") {
    if (!data.cardBankId) return { error: "Kredi kartı için banka anlaşması seçin." };
    if (data.installmentCount < 1) return { error: "Taksit sayısı en az 1 olmalı." };
  }

  let studentId = "";
  let enrollmentId = "";
  try {
    const ctx = await requireOperations();
    const student = await ctx.db.student.findFirst({ where: { id: data.studentId } });
    if (!student) return { error: "Öğrenci bulunamadı." };

    let blockDays = 0;
    if (data.paymentChannel === "CREDIT_CARD" && data.cardBankId) {
      const bank = await ctx.db.cardBankSetting.findFirst({ where: { id: data.cardBankId, active: true } });
      if (!bank) return { error: "Banka anlaşması bulunamadı." };
      blockDays = bank.blockDays;
    }

    const enrolledAt = new Date(`${data.enrolledAt}T12:00:00`);
    const installmentCount = data.paymentChannel === "CREDIT_CARD" ? data.installmentCount : 1;
    const drafts = buildIncomeSchedule({
      annualFee: data.annualFee,
      installmentCount,
      paymentDate: enrolledAt,
      blockDays,
    });

    const enrollment = await ctx.db.enrollment.create({
      data: {
        tenantId: ctx.tenantId,
        studentId: data.studentId,
        academicYear: data.academicYear,
        annualFee: new Prisma.Decimal(data.annualFee),
        paymentChannel: data.paymentChannel,
        installmentCount,
        cardBankId: data.paymentChannel === "CREDIT_CARD" ? data.cardBankId || null : null,
        enrolledAt,
        notes: data.notes || null,
        scheduleLines: {
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
    revalidatePath("/students");
    revalidatePath("/income");
    studentId = student.id;
    enrollmentId = enrollment.id;
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  redirect(`/students/${studentId}?enrollment=${enrollmentId}`);
}
