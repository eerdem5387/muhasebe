"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireAuth, requireOperations, canApproveAsPrincipal, canManageOperations } from "@/lib/context";
import {
  completeExpenseRequestSchema,
  expenseRequestSchema,
  expenseSchema,
} from "@/lib/validation";
import { ForbiddenError, toErrorMessage } from "@/lib/errors";
import { requireUpload } from "@/server/uploads";
import {
  applyExpenseRequestApproval,
  applyExpenseRequestRejection,
  completeExpenseRequest,
} from "@/server/expense-request-approval";
import {
  pushFinanceEventToOkul,
  serializeExpenseRequest,
} from "@/server/okul-webhook";
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
      if (!req || (req.status !== "APPROVED" && req.status !== "COMPLETED")) {
        return { error: "Yalnızca onaylanmış talepler için gider kaydı açılabilir." };
      }
    }

    const upload = await requireUpload(formData);
    const channel = parsed.data.channel;
    const requestChannel =
      channel === "BANK" ||
      channel === "CHECK" ||
      channel === "CREDIT_CARD" ||
      channel === "CASH" ||
      channel === "PROMISSORY"
        ? channel
        : null;

    await ctx.db.expense.create({
      data: {
        tenantId: ctx.tenantId,
        categoryId: category.id,
        requestId: parsed.data.requestId || null,
        amount: new Prisma.Decimal(parsed.data.amount),
        spentAt: new Date(`${parsed.data.spentAt}T12:00:00`),
        channel: requestChannel,
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
    const created = await ctx.db.expenseRequest.create({
      data: {
        tenantId: ctx.tenantId,
        title: parsed.data.title,
        total: null,
        requesterName: parsed.data.requesterName,
        channel: parsed.data.channel,
        notes: parsed.data.notes || null,
        createdById: ctx.userId,
      },
    });
    await pushFinanceEventToOkul(
      "expense_request.upserted",
      ctx.tenantId,
      serializeExpenseRequest(created),
    );
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  revalidatePath("/requests");
  return { success: "Talep gönderildi. Kurucu onayı (okul paneli) bekleniyor." };
}

export async function completeExpenseRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = completeExpenseRequestSchema.safeParse({
    id: formData.get("id"),
    amount: formData.get("amount"),
    occurredAt: formData.get("occurredAt"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };

  try {
    const ctx = await requireOperations();
    const result = await completeExpenseRequest({
      tenantId: ctx.tenantId,
      requestId: parsed.data.id,
      actorId: ctx.userId,
      amount: Number(parsed.data.amount),
      occurredAt: new Date(`${parsed.data.occurredAt}T12:00:00`),
    });
    if (!result.ok) return { error: result.error };
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  revalidatePath("/requests");
  revalidatePath("/monthly");
  return { success: "Harcama tutarı kaydedildi ve talep tamamlandı." };
}

/** Müdür kaydı (opsiyonel; kurucu onayı asıl karardır). */
export async function approveRequestAction(formData: FormData): Promise<void> {
  const ctx = await requireAuth();
  const id = String(formData.get("id") ?? "");
  const as = String(formData.get("as") ?? "");
  if (as !== "principal") return;
  if (!canApproveAsPrincipal(ctx.role, ctx.isSuperAdmin)) throw new ForbiddenError();

  const result = await applyExpenseRequestApproval({
    tenantId: ctx.tenantId,
    requestId: id,
    as: "principal",
    actorId: ctx.userId,
  });
  if (!result.ok) return;
  revalidatePath("/requests");
}

export async function rejectRequestAction(formData: FormData): Promise<void> {
  const ctx = await requireAuth();
  const id = String(formData.get("id") ?? "");
  if (!canApproveAsPrincipal(ctx.role, ctx.isSuperAdmin) && !canManageOperations(ctx.role, ctx.isSuperAdmin)) {
    throw new ForbiddenError();
  }
  await applyExpenseRequestRejection({
    tenantId: ctx.tenantId,
    requestId: id,
    actorId: ctx.userId,
    reason: String(formData.get("reason") ?? "") || null,
  });
  revalidatePath("/requests");
}
