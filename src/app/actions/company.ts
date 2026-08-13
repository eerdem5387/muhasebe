"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/context";
import { setActiveCompany } from "@/lib/session";
import { createCompany, companyProfileData } from "@/server/companies";
import { companySchema, accountSchema } from "@/lib/validation";
import { toErrorMessage } from "@/lib/errors";
import type { ActionState } from "./types";

export async function createCompanyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = companySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };

  try {
    const ctx = await requireAuth();
    const company = await createCompany({ tenantId: ctx.tenantId, ...parsed.data });
    if (!ctx.companyId) await setActiveCompany(company.id);
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  revalidatePath("/companies");
  return { success: "Şirket ve varsayılan hesap planı oluşturuldu." };
}

export async function updateCompanyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Şirket bulunamadı." };
  const parsed = companySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };

  try {
    const ctx = await requireAuth();
    const existing = await ctx.db.company.findFirst({ where: { id }, select: { id: true } });
    if (!existing) return { error: "Şirket bulunamadı." };
    await ctx.db.company.updateMany({
      where: { id },
      data: { name: parsed.data.name, ...companyProfileData(parsed.data) },
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  revalidatePath("/companies");
  revalidatePath(`/companies/${id}/edit`);
  return { success: "Şirket bilgileri güncellendi." };
}

export async function createAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };

  try {
    const ctx = await requireAuth();
    if (!ctx.companyId) return { error: "Önce bir şirket seçin." };
    const duplicate = await ctx.db.account.findFirst({
      where: { companyId: ctx.companyId, code: parsed.data.code },
    });
    if (duplicate) return { error: "Bu hesap kodu bu şirkette zaten mevcut." };

    await ctx.db.account.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        code: parsed.data.code,
        name: parsed.data.name,
        type: parsed.data.type,
      },
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  revalidatePath("/accounts");
  return { success: "Hesap eklendi." };
}
