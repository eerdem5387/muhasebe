"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireAuth, requireOperations, canApproveAsFounder, canApproveAsPrincipal } from "@/lib/context";
import { expenseRequestSchema, expenseSchema } from "@/lib/validation";
import { ForbiddenError, toErrorMessage } from "@/lib/errors";
import { requireUpload } from "@/server/uploads";
import type { ActionState } from "./types";

export async function createExpenseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = expenseSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    spentAt: formData.get("spentAt"),
    channel: formData.get("channel") ?? "",
    notes: formData.get("notes") ?? "",
    requestId: formData.get("requestId") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };

  try {
    const ctx = await requireOperations();
    const category = await ctx.db.ledgerCategory.findFirst({
      where: { id: parsed.data.categoryId, type: "EXPENSE" },
    });
    if (!category) return { error: "Gider kalemi bulunamadı." };

    if (parsed.data.requestId) {
      const req = await ctx.db.expenseRequest.findFirst({ where: { id: parsed.data.requestId } });
      if (!req || req.status !== "APPROVED") {
        return { error: "Yalnızca onaylanmış talepler için gider kaydı açılabilir." };
      }
    }

    const upload = await requireUpload(formData);

    await ctx.db.expense.create({
      data: {
        tenantId: ctx.tenantId,
        categoryId: category.id,
        requestId: parsed.data.requestId || null,
        amount: new Prisma.Decimal(parsed.data.amount),
        spentAt: new Date(`${parsed.data.spentAt}T12:00:00`),
        channel: parsed.data.channel === "CREDIT_CARD" || parsed.data.channel === "TRANSFER"
          ? parsed.data.channel
          : null,
        notes: parsed.data.notes || null,
        attachments: {
          create: {
            tenantId: ctx.tenantId,
            kind: "RECEIPT",
            filename: upload.filename,
            mimeType: upload.mimeType,
            bytes: upload.bytes,
          },
        },
      },
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  revalidatePath("/expenses");
  return { success: "Gider kaydedildi." };
}

export async function createExpenseRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = expenseRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  try {
    const ctx = await requireOperations();
    const qty = new Prisma.Decimal(parsed.data.quantity);
    const unit = new Prisma.Decimal(parsed.data.unitPrice);
    await ctx.db.expenseRequest.create({
      data: {
        tenantId: ctx.tenantId,
        title: parsed.data.title,
        quantity: qty,
        unitPrice: unit,
        total: qty.mul(unit).toDecimalPlaces(2),
        requesterName: parsed.data.requesterName,
        channel: parsed.data.channel,
        notes: parsed.data.notes || null,
        createdById: ctx.userId,
      },
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  revalidatePath("/requests");
  return { success: "Talep gönderildi. Müdür ve kurucu onayı bekleniyor." };
}

export async function approveRequestAction(formData: FormData): Promise<void> {
  const ctx = await requireAuth();
  const id = String(formData.get("id") ?? "");
  const as = String(formData.get("as") ?? "");
  const req = await ctx.db.expenseRequest.findFirst({ where: { id } });
  if (!req || req.status !== "PENDING") return;

  const now = new Date();
  let principalApprovedAt = req.principalApprovedAt;
  let principalApprovedBy = req.principalApprovedBy;
  let founderApprovedAt = req.founderApprovedAt;
  let founderApprovedBy = req.founderApprovedBy;

  if (as === "principal") {
    if (!canApproveAsPrincipal(ctx.role, ctx.isSuperAdmin)) throw new ForbiddenError();
    principalApprovedAt = now;
    principalApprovedBy = ctx.userId;
  } else if (as === "founder") {
    if (!canApproveAsFounder(ctx.role, ctx.isSuperAdmin)) throw new ForbiddenError();
    founderApprovedAt = now;
    founderApprovedBy = ctx.userId;
  } else {
    return;
  }

  const both = Boolean(principalApprovedAt && founderApprovedAt);
  await ctx.db.expenseRequest.updateMany({
    where: { id },
    data: {
      principalApprovedAt,
      principalApprovedBy,
      founderApprovedAt,
      founderApprovedBy,
      status: both ? "APPROVED" : "PENDING",
    },
  });
  revalidatePath("/requests");
}

export async function rejectRequestAction(formData: FormData): Promise<void> {
  const ctx = await requireAuth();
  const id = String(formData.get("id") ?? "");
  if (!canApproveAsPrincipal(ctx.role, ctx.isSuperAdmin) && !canApproveAsFounder(ctx.role, ctx.isSuperAdmin)) {
    throw new ForbiddenError();
  }
  await ctx.db.expenseRequest.updateMany({
    where: { id, status: "PENDING" },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectedById: ctx.userId,
      rejectReason: String(formData.get("reason") ?? "") || null,
    },
  });
  revalidatePath("/requests");
}
