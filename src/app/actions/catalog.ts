"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/context";
import { productSchema, taxSchema } from "@/lib/validation";
import { toErrorMessage } from "@/lib/errors";
import type { ActionState } from "./types";

export async function createProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };

  try {
    const ctx = await requireAuth();
    await ctx.db.product.create({
      data: {
        tenantId: ctx.tenantId,
        name: parsed.data.name,
        type: parsed.data.type,
        unit: parsed.data.unit,
        defaultPrice: parsed.data.defaultPrice,
      },
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  revalidatePath("/products");
  return { success: "Ürün/hizmet eklendi." };
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const ctx = await requireAuth();
  try {
    await ctx.db.product.deleteMany({ where: { id } });
  } catch {
    /* referenced by invoice lines */
  }
  revalidatePath("/products");
}

export async function createTaxAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = taxSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };

  try {
    const ctx = await requireAuth();
    await ctx.db.tax.create({
      data: { tenantId: ctx.tenantId, name: parsed.data.name, rate: parsed.data.rate },
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  revalidatePath("/taxes");
  return { success: "Vergi eklendi." };
}

export async function deleteTaxAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const ctx = await requireAuth();
  try {
    await ctx.db.tax.deleteMany({ where: { id } });
  } catch {
    /* referenced by invoice lines */
  }
  revalidatePath("/taxes");
}
