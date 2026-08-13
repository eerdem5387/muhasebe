"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/context";
import { activitySchema, contactSchema } from "@/lib/validation";
import { toErrorMessage } from "@/lib/errors";
import type { ActionState } from "./types";

export async function createContactAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };

  try {
    const ctx = await requireAuth();
    await ctx.db.contact.create({
      data: { tenantId: ctx.tenantId, ...contactData(parsed.data) },
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }

  revalidatePath("/contacts");
  return { success: "Cari eklendi." };
}

type ContactFields = ReturnType<typeof contactSchema.parse>;

function contactData(d: ContactFields) {
  return {
    name: d.name,
    type: d.type,
    email: d.email || null,
    phone: d.phone || null,
    taxNumber: d.taxNumber || null,
    tckn: d.tckn || null,
    taxOffice: d.taxOffice || null,
    address: d.address || null,
    neighborhood: d.neighborhood || null,
    district: d.district || null,
    city: d.city || null,
    country: d.country || "Türkiye",
    postalCode: d.postalCode || null,
    crmStage: d.crmStage,
  };
}

export async function updateContactAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Cari bulunamadı." };
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };

  try {
    const ctx = await requireAuth();
    const existing = await ctx.db.contact.findFirst({ where: { id }, select: { id: true } });
    if (!existing) return { error: "Cari bulunamadı." };
    await ctx.db.contact.updateMany({ where: { id }, data: contactData(parsed.data) });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  return { success: "Cari güncellendi." };
}

export async function updateContactStageAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const crmStage = String(formData.get("crmStage") ?? "") as
    | "NEW"
    | "CONTACTED"
    | "QUALIFIED"
    | "PROPOSAL"
    | "WON"
    | "LOST";
  const ctx = await requireAuth();
  await ctx.db.contact.updateMany({ where: { id }, data: { crmStage } });
  revalidatePath("/contacts");
  revalidatePath("/crm");
}

export async function deleteContactAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const ctx = await requireAuth();
  try {
    await ctx.db.contact.deleteMany({ where: { id } });
  } catch {
    // Contact is referenced by ledger/invoices; ignore hard-delete failure.
  }
  revalidatePath("/contacts");
}

export async function addActivityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = activitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };

  try {
    const ctx = await requireAuth();
    const contact = await ctx.db.contact.findFirst({ where: { id: parsed.data.contactId }, select: { id: true } });
    if (!contact) return { error: "Cari bulunamadı." };
    await ctx.db.contactActivity.create({
      data: {
        tenantId: ctx.tenantId,
        contactId: parsed.data.contactId,
        type: parsed.data.type,
        subject: parsed.data.subject,
        notes: parsed.data.notes || null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      },
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }

  revalidatePath(`/contacts/${parsed.data.contactId}`);
  return { success: "Aktivite eklendi." };
}

export async function toggleActivityAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  const done = String(formData.get("done") ?? "") === "true";
  const ctx = await requireAuth();
  await ctx.db.contactActivity.updateMany({ where: { id }, data: { done: !done } });
  revalidatePath(`/contacts/${contactId}`);
}
