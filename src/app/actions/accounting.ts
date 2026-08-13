"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCompany } from "@/lib/context";
import { invoiceSchema } from "@/lib/validation";
import { toErrorMessage } from "@/lib/errors";
import { createInvoiceWithPosting, recordPayment } from "@/server/accounting/engine";
import type { ActionState } from "./types";

export async function createInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let lines: unknown = [];
  try {
    lines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return { error: "Fatura kalemleri okunamadı." };
  }

  const parsed = invoiceSchema.safeParse({
    type: formData.get("type"),
    contactId: formData.get("contactId"),
    einvoiceProfile: formData.get("einvoiceProfile") ?? "NONE",
    dispatchType: formData.get("dispatchType") ?? "ELEKTRONIK",
    invoiceNumber: formData.get("invoiceNumber"),
    issueDate: formData.get("issueDate"),
    issueTime: formData.get("issueTime") ?? "",
    dueDate: formData.get("dueDate") ?? "",
    note: formData.get("note") ?? "",
    priceMode: formData.get("priceMode") ?? "EXCLUSIVE",
    lines,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };

  try {
    const ctx = await requireCompany();
    const issueDate = new Date(
      parsed.data.issueTime
        ? `${parsed.data.issueDate}T${parsed.data.issueTime}`
        : parsed.data.issueDate,
    );
    await createInvoiceWithPosting({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      type: parsed.data.type,
      contactId: parsed.data.contactId,
      einvoiceProfile: parsed.data.einvoiceProfile,
      dispatchType: parsed.data.dispatchType,
      invoiceNumber: parsed.data.invoiceNumber,
      issueDate,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      note: parsed.data.note || null,
      priceMode: parsed.data.priceMode,
      lines: parsed.data.lines.map((l) => ({
        productId: l.productId || null,
        description: l.description || null,
        unit: l.unit || null,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountRate: l.discountRate || "0",
        taxId: l.taxId || null,
      })),
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }

  revalidatePath("/invoices");
  revalidatePath("/journal");
  redirect("/invoices");
}

export async function recordPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const contactId = String(formData.get("contactId") ?? "");
  const direction = String(formData.get("direction") ?? "COLLECTION") as "COLLECTION" | "PAYMENT";
  const via = String(formData.get("via") ?? "BANK") as "CASH" | "BANK";
  const amount = String(formData.get("amount") ?? "").replace(",", ".");
  const date = String(formData.get("date") ?? "");
  const description = String(formData.get("description") ?? "");

  if (!contactId) return { error: "Cari seçin." };
  if (!date) return { error: "Tarih gerekli." };
  if (!amount || Number.isNaN(Number(amount))) return { error: "Geçerli bir tutar girin." };

  try {
    const ctx = await requireCompany();
    await recordPayment({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      contactId,
      direction,
      via,
      amount,
      date: new Date(date),
      description: description || null,
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }

  revalidatePath("/journal");
  revalidatePath("/reports/statement");
  return { success: direction === "COLLECTION" ? "Tahsilat kaydedildi." : "Ödeme kaydedildi." };
}
