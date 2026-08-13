"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { requireCompany } from "@/lib/context";
import { toErrorMessage } from "@/lib/errors";
import { reverseLedgerEntry } from "@/server/accounting/vouchers";
import type { ActionState } from "./types";

export async function convertToEInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const profile = String(formData.get("profile") ?? "EARSIV") as "EARSIV" | "EFATURA";
  if (!id) return { error: "Fatura bulunamadı." };

  try {
    const ctx = await requireCompany();
    const invoice = await ctx.db.invoice.findFirst({ where: { id, companyId: ctx.companyId } });
    if (!invoice) return { error: "Fatura bulunamadı." };
    if (invoice.status === "CANCELLED") return { error: "İptal edilmiş fatura dönüştürülemez." };

    await ctx.db.invoice.updateMany({
      where: { id, companyId: ctx.companyId },
      data: {
        einvoiceProfile: profile,
        ettn: invoice.ettn ?? randomUUID(),
        status: "SENT",
      },
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }

  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  return { success: "Fatura e-faturaya dönüştürüldü ve gönderildi (mock)." };
}

export async function cancelInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Fatura bulunamadı." };

  try {
    const ctx = await requireCompany();
    const invoice = await ctx.db.invoice.findFirst({ where: { id, companyId: ctx.companyId } });
    if (!invoice) return { error: "Fatura bulunamadı." };
    if (invoice.status === "CANCELLED") return { error: "Fatura zaten iptal edilmiş." };

    const entry = await ctx.db.ledgerEntry.findFirst({
      where: { companyId: ctx.companyId, documentType: "INVOICE", documentId: id, reversalOfId: null },
    });
    if (entry) {
      const reversed = await ctx.db.ledgerEntry.findFirst({ where: { reversalOfId: entry.id } });
      if (!reversed) {
        await reverseLedgerEntry(ctx.tenantId, ctx.companyId, entry.id);
      }
    }

    await ctx.db.invoice.updateMany({
      where: { id, companyId: ctx.companyId },
      data: { status: "CANCELLED" },
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }

  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  revalidatePath("/journal");
  return { success: "Fatura iptal edildi ve ters kayıt oluşturuldu." };
}
