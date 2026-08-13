"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCompany } from "@/lib/context";
import { toErrorMessage } from "@/lib/errors";
import { createManualEntry, reverseLedgerEntry } from "@/server/accounting/vouchers";
import type { ActionState } from "./types";

export async function reverseEntryAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const ctx = await requireCompany();
  await reverseLedgerEntry(ctx.tenantId, ctx.companyId, id);
  revalidatePath("/journal");
}

export async function createManualEntryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const date = String(formData.get("date") ?? "");
  const description = String(formData.get("description") ?? "");
  let lines: { accountId: string; contactId?: string; debit?: string; credit?: string }[] = [];
  try {
    lines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return { error: "Fiş satırları okunamadı." };
  }

  const cleaned = lines
    .map((l) => ({
      accountId: l.accountId,
      contactId: l.contactId || null,
      debit: (l.debit ?? "0").replace(",", "."),
      credit: (l.credit ?? "0").replace(",", "."),
    }))
    .filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0));

  if (cleaned.length < 2) return { error: "En az iki satır (borç ve alacak) gereklidir." };
  if (!date) return { error: "Tarih gerekli." };

  try {
    const ctx = await requireCompany();
    await createManualEntry({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      date: new Date(date),
      description: description || null,
      lines: cleaned,
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }

  revalidatePath("/journal");
  redirect("/journal");
}
