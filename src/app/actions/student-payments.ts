"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type PaymentChannel, type PaymentProgress } from "@prisma/client";
import { requireOperations } from "@/lib/context";
import { collectionSchema } from "@/lib/validation";
import { toErrorMessage } from "@/lib/errors";
import { readUpload, requiredKindForChannel } from "@/server/uploads";
import { scheduleStatus } from "@/server/income-schedule";
import { inferPaymentProgress } from "@/server/payment-progress";
import { toYearMonth } from "@/lib/format";
import type { ActionState } from "./types";

function revalidateStudent(studentId: string) {
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/collections");
  revalidatePath("/income");
}

async function applyAutoProgress(
  db: Awaited<ReturnType<typeof requireOperations>>["db"],
  enrollmentId: string,
) {
  const enrollment = await db.enrollment.findFirst({
    where: { id: enrollmentId },
    include: { collections: { select: { amount: true } } },
  });
  if (!enrollment || enrollment.paymentProgressManual) return;
  const collected = enrollment.collections.reduce((sum, c) => sum + Number(c.amount), 0);
  const progress = inferPaymentProgress(Number(enrollment.annualFee), collected);
  if (progress !== enrollment.paymentProgress) {
    await db.enrollment.update({ where: { id: enrollmentId }, data: { paymentProgress: progress } });
  }
}

export async function setPaymentProgressAction(formData: FormData): Promise<void> {
  await updatePaymentProgressAction({}, formData);
}

export async function updatePaymentProgressAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const progress = String(formData.get("paymentProgress") ?? "") as PaymentProgress;
  if (!enrollmentId || !["NOT_STARTED", "IN_PROGRESS", "COMPLETED"].includes(progress)) {
    return { error: "Geçersiz ödeme durumu." };
  }
  try {
    const ctx = await requireOperations();
    const enrollment = await ctx.db.enrollment.findFirst({ where: { id: enrollmentId } });
    if (!enrollment) return { error: "Kayıt bulunamadı." };
    await ctx.db.enrollment.update({
      where: { id: enrollmentId },
      data: { paymentProgress: progress, paymentProgressManual: true },
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  revalidateStudent(studentId);
  return { success: "Ödeme durumu güncellendi." };
}

export async function updateExpectedChannelAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const paymentChannel = String(formData.get("paymentChannel") ?? "") as PaymentChannel;
  if (!["EFT", "CREDIT_CARD", "CHECK", "CASH"].includes(paymentChannel)) {
    return { error: "Geçerli bir ödeme yöntemi seçin." };
  }
  try {
    const ctx = await requireOperations();
    const enrollment = await ctx.db.enrollment.findFirst({ where: { id: enrollmentId } });
    if (!enrollment) return { error: "Kayıt bulunamadı." };
    await ctx.db.enrollment.update({
      where: { id: enrollmentId },
      data: { paymentChannel },
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  revalidateStudent(studentId);
  return { success: "Alınacak yöntem güncellendi." };
}

export async function recordStudentPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const studentId = String(formData.get("studentId") ?? "");
  const scheduleLineId = String(formData.get("scheduleLineId") ?? "").trim();
  const parsed = collectionSchema.safeParse({
    enrollmentId: formData.get("enrollmentId"),
    amount: formData.get("amount"),
    collectedAt: formData.get("collectedAt"),
    paymentChannel: formData.get("paymentChannel"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };

  try {
    const ctx = await requireOperations();
    const enrollment = await ctx.db.enrollment.findFirst({
      where: { id: parsed.data.enrollmentId },
      include: { scheduleLines: true },
    });
    if (!enrollment) return { error: "Kayıt bulunamadı." };

    const upload = await readUpload(formData);
    const kind = requiredKindForChannel(parsed.data.paymentChannel);

    await ctx.db.collection.create({
      data: {
        tenantId: ctx.tenantId,
        enrollmentId: enrollment.id,
        amount: new Prisma.Decimal(parsed.data.amount),
        collectedAt: new Date(`${parsed.data.collectedAt}T12:00:00`),
        paymentChannel: parsed.data.paymentChannel,
        notes: parsed.data.notes || null,
        attachments: upload
          ? {
              create: {
                tenantId: ctx.tenantId,
                kind,
                filename: upload.filename,
                mimeType: upload.mimeType,
                bytes: upload.bytes,
              },
            }
          : undefined,
      },
    });

    const line = scheduleLineId
      ? enrollment.scheduleLines.find((l) => l.id === scheduleLineId)
      : enrollment.scheduleLines.find((l) => l.status !== "REALIZED");
    if (line) {
      await ctx.db.incomeScheduleLine.update({
        where: { id: line.id },
        data: { status: "REALIZED", plannedChannel: parsed.data.paymentChannel },
      });
    }
    await applyAutoProgress(ctx.db, enrollment.id);
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  revalidateStudent(studentId);
  return { success: "Ödeme kaydedildi." };
}

export async function createPlannedPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const studentId = String(formData.get("studentId") ?? "");
  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  const amountRaw = String(formData.get("amount") ?? "").replace(",", ".");
  const dueAt = String(formData.get("dueAt") ?? "");
  const paymentChannel = String(formData.get("paymentChannel") ?? "") as PaymentChannel;
  const amount = Number(amountRaw);
  if (!enrollmentId || !dueAt || !Number.isFinite(amount) || amount <= 0) {
    return { error: "Tarih ve geçerli bir tutar girin." };
  }
  if (!["EFT", "CREDIT_CARD", "CHECK", "CASH"].includes(paymentChannel)) {
    return { error: "Ödeme yöntemi seçin." };
  }
  try {
    const ctx = await requireOperations();
    const enrollment = await ctx.db.enrollment.findFirst({
      where: { id: enrollmentId },
      include: { scheduleLines: { orderBy: { installmentIndex: "desc" }, take: 1 } },
    });
    if (!enrollment) return { error: "Kayıt bulunamadı." };
    const releaseDate = new Date(`${dueAt}T12:00:00`);
    const nextIndex = (enrollment.scheduleLines[0]?.installmentIndex ?? 0) + 1;
    await ctx.db.incomeScheduleLine.create({
      data: {
        tenantId: ctx.tenantId,
        enrollmentId: enrollment.id,
        installmentIndex: nextIndex,
        amount: new Prisma.Decimal(amountRaw),
        releaseDate,
        yearMonth: toYearMonth(releaseDate),
        status: scheduleStatus(releaseDate, false),
        plannedChannel: paymentChannel,
      },
    });
    if (!enrollment.paymentProgressManual && enrollment.paymentProgress === "NOT_STARTED") {
      await ctx.db.enrollment.update({
        where: { id: enrollment.id },
        data: { paymentProgress: "IN_PROGRESS" },
      });
    }
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  revalidateStudent(studentId);
  return { success: "İleri tarihli ödeme planlandı." };
}

export async function deletePlannedPaymentAction(formData: FormData): Promise<void> {
  const studentId = String(formData.get("studentId") ?? "");
  const id = String(formData.get("id") ?? "");
  const ctx = await requireOperations();
  const line = await ctx.db.incomeScheduleLine.findFirst({ where: { id } });
  if (line && line.status !== "REALIZED") {
    await ctx.db.incomeScheduleLine.delete({ where: { id } });
  }
  revalidateStudent(studentId);
}

export async function deleteStudentCollectionAction(formData: FormData): Promise<void> {
  const studentId = String(formData.get("studentId") ?? "");
  const id = String(formData.get("id") ?? "");
  const ctx = await requireOperations();
  const collection = await ctx.db.collection.findFirst({ where: { id } });
  if (!collection) return;
  await ctx.db.collection.delete({ where: { id } });
  await applyAutoProgress(ctx.db, collection.enrollmentId);
  revalidateStudent(studentId);
}
