"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireOperations } from "@/lib/context";
import { collectionSchema } from "@/lib/validation";
import { toErrorMessage } from "@/lib/errors";
import { requiredKindForChannel, requireUpload } from "@/server/uploads";
import { scheduleStatus } from "@/server/income-schedule";
import type { ActionState } from "./types";

export async function createCollectionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
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

    const upload = await requireUpload(formData);
    const kind = requiredKindForChannel(parsed.data.paymentChannel);

    await ctx.db.collection.create({
      data: {
        tenantId: ctx.tenantId,
        enrollmentId: enrollment.id,
        amount: new Prisma.Decimal(parsed.data.amount),
        collectedAt: new Date(`${parsed.data.collectedAt}T12:00:00`),
        paymentChannel: parsed.data.paymentChannel,
        notes: parsed.data.notes || null,
        attachments: {
          create: {
            tenantId: ctx.tenantId,
            kind,
            filename: upload.filename,
            mimeType: upload.mimeType,
            bytes: upload.bytes,
          },
        },
      },
    });

    for (const line of enrollment.scheduleLines) {
      await ctx.db.incomeScheduleLine.updateMany({
        where: { id: line.id },
        data: { status: scheduleStatus(line.releaseDate, true) },
      });
    }
  } catch (err) {
    return { error: toErrorMessage(err) };
  }

  revalidatePath("/collections");
  revalidatePath("/income");
  revalidatePath("/students");
  return { success: "Tahsilat ve belge kaydedildi." };
}
