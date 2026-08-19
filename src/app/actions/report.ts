"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireOperations } from "@/lib/context";
import { reportEntrySchema } from "@/lib/validation";
import { toErrorMessage } from "@/lib/errors";
import type { ActionState } from "./types";

function revalidateMonth(yearMonth: string) {
  revalidatePath("/monthly");
  revalidatePath(`/monthly?month=${yearMonth}`);
}

export async function createReportEntryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = reportEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  const data = parsed.data;

  try {
    const ctx = await requireOperations();
    let groupId = data.groupId || "";
    if (groupId) {
      const group = await ctx.db.reportGroup.findFirst({ where: { id: groupId, side: data.side } });
      if (!group) return { error: "Ana kalem bulunamadı." };
    } else {
      const name = data.groupName?.trim();
      if (!name) return { error: "Ana kalem seçin veya yeni ana kalem adı yazın." };
      const existing = await ctx.db.reportGroup.findFirst({
        where: { side: data.side, name: { equals: name, mode: "insensitive" } },
      });
      if (existing) {
        groupId = existing.id;
      } else {
        const created = await ctx.db.reportGroup.create({
          data: { tenantId: ctx.tenantId, side: data.side, name },
        });
        groupId = created.id;
      }
    }

    let itemId = data.itemId || "";
    if (itemId) {
      const item = await ctx.db.reportItem.findFirst({ where: { id: itemId, groupId } });
      if (!item) return { error: "Alt kalem bu ana kaleme ait değil." };
    } else {
      const name = data.itemName?.trim();
      if (!name) return { error: "Alt kalem seçin veya yeni alt kalem adı yazın." };
      const existing = await ctx.db.reportItem.findFirst({
        where: { groupId, name: { equals: name, mode: "insensitive" } },
      });
      if (existing) {
        itemId = existing.id;
      } else {
        const created = await ctx.db.reportItem.create({
          data: { tenantId: ctx.tenantId, groupId, name },
        });
        itemId = created.id;
      }
    }

    await ctx.db.reportEntry.create({
      data: {
        tenantId: ctx.tenantId,
        itemId,
        yearMonth: data.yearMonth,
        amount: new Prisma.Decimal(data.amount),
        occurredAt: new Date(`${data.occurredAt}T12:00:00`),
        payKind: data.side === "EXPENSE" ? data.payKind : "CASH",
        notes: data.notes || null,
      },
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  revalidateMonth(data.yearMonth);
  return { success: "Kayıt eklendi." };
}

export async function deleteReportEntryAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const yearMonth = String(formData.get("yearMonth") ?? "");
  const ctx = await requireOperations();
  await ctx.db.reportEntry.deleteMany({ where: { id } });
  revalidateMonth(yearMonth);
}

export async function deleteReportItemAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const yearMonth = String(formData.get("yearMonth") ?? "");
  const ctx = await requireOperations();
  await ctx.db.reportItem.deleteMany({ where: { id } });
  revalidateMonth(yearMonth);
}

export async function deleteReportGroupAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const yearMonth = String(formData.get("yearMonth") ?? "");
  const ctx = await requireOperations();
  await ctx.db.reportGroup.deleteMany({ where: { id } });
  revalidateMonth(yearMonth);
}
