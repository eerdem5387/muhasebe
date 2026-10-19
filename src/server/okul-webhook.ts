import "server-only";
import { resolveIntegrationSecret } from "@/lib/integration-auth";

export type OkulFinanceEventType =
  | "expense_request.upserted"
  | "cashbook_entry.upserted"
  | "expense_request.deleted"
  | "cashbook_entry.deleted";

export type OkulFinanceEvent = {
  specVersion: "1";
  eventId: string;
  eventType: OkulFinanceEventType;
  occurredAt: string;
  tenantId: string;
  data: Record<string, unknown>;
};

function okulWebhookUrl(): string | null {
  const base =
    process.env.OKUL_INTEGRATION_URL?.trim() ||
    process.env.OKUL_WEBHOOK_URL?.trim() ||
    "";
  if (!base) return null;
  if (base.includes("/api/webhook/muhasebe")) return base;
  return `${base.replace(/\/$/, "")}/api/webhook/muhasebe`;
}

/** Fire-and-forget push to okul-yonetim. Never throws to callers. */
export async function pushFinanceEventToOkul(
  eventType: OkulFinanceEventType,
  tenantId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const url = okulWebhookUrl();
  const secret = resolveIntegrationSecret();
  if (!url || !secret) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[okul-webhook] OKUL_INTEGRATION_URL / INTEGRATION_SECRET eksik; push atlandı.");
    }
    return;
  }

  const body: OkulFinanceEvent = {
    specVersion: "1",
    eventId: crypto.randomUUID(),
    eventType,
    occurredAt: new Date().toISOString(),
    tenantId,
    data,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
        "X-Service-Secret": secret,
        "X-Webhook-Source": "muhasebe",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[okul-webhook] push failed", res.status, text.slice(0, 300));
    }
  } catch (err) {
    console.error("[okul-webhook] push error", err);
  }
}

export function serializeExpenseRequest(row: {
  id: string;
  tenantId: string;
  title: string;
  total: { toString(): string } | number | null;
  requesterName: string;
  channel: string;
  status: string;
  notes: string | null;
  createdById: string;
  principalApprovedAt: Date | null;
  principalApprovedBy: string | null;
  founderApprovedAt: Date | null;
  founderApprovedBy: string | null;
  completedAt?: Date | null;
  completedById?: string | null;
  rejectedAt: Date | null;
  rejectedById: string | null;
  rejectReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    title: row.title,
    total: row.total == null ? null : String(row.total),
    quantity: null,
    unitPrice: null,
    requesterName: row.requesterName,
    channel: row.channel,
    status: row.status,
    notes: row.notes,
    createdById: row.createdById,
    principalApprovedAt: row.principalApprovedAt?.toISOString() ?? null,
    principalApprovedBy: row.principalApprovedBy,
    founderApprovedAt: row.founderApprovedAt?.toISOString() ?? null,
    founderApprovedBy: row.founderApprovedBy,
    completedAt: row.completedAt?.toISOString() ?? null,
    completedById: row.completedById ?? null,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    rejectedById: row.rejectedById,
    rejectReason: row.rejectReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeCashbookEntry(row: {
  id: string;
  side: string;
  yearMonth: string;
  amount: { toString(): string } | number;
  occurredAt: Date;
  channel: string;
  bankName: string | null;
  checkInstallments: number | null;
  incomeCategory: string | null;
  payerFirstName: string | null;
  payerLastName: string | null;
  payerIdentityNo: string | null;
  expenseTitle: string | null;
  payeeIdentityNo: string | null;
  invoiceNo: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    side: row.side,
    yearMonth: row.yearMonth,
    amount: String(row.amount),
    occurredAt: row.occurredAt.toISOString(),
    channel: row.channel,
    bankName: row.bankName,
    checkInstallments: row.checkInstallments,
    incomeCategory: row.incomeCategory,
    payerFirstName: row.payerFirstName,
    payerLastName: row.payerLastName,
    payerIdentityNo: row.payerIdentityNo,
    expenseTitle: row.expenseTitle,
    payeeIdentityNo: row.payeeIdentityNo,
    invoiceNo: row.invoiceNo,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
