import "server-only";
import { Prisma } from "@prisma/client";
import { prisma, getTenantDb } from "@/lib/prisma";
import { CHANNEL_TR, toYearMonth } from "@/lib/format";
import {
  pushFinanceEventToOkul,
  serializeCashbookEntry,
  serializeExpenseRequest,
} from "@/server/okul-webhook";

/** RequestChannel → CashbookChannel */
function toCashbookChannel(
  channel: string,
): "BANK" | "CHECK" | "CREDIT_CARD" | "CASH" | "PROMISSORY" {
  if (channel === "CREDIT_CARD") return "CREDIT_CARD";
  if (channel === "CHECK") return "CHECK";
  if (channel === "PROMISSORY") return "PROMISSORY";
  if (channel === "BANK" || channel === "TRANSFER") return "BANK";
  return "CASH";
}

export async function applyExpenseRequestApproval(input: {
  tenantId: string;
  requestId: string;
  as: "principal" | "founder";
  actorId: string;
  approvedAt?: Date;
}) {
  const db = getTenantDb(input.tenantId);
  const req = await db.expenseRequest.findFirst({ where: { id: input.requestId } });
  if (!req) return { ok: false as const, error: "Talep bulunamadı.", status: 404 };
  if (req.status !== "PENDING") {
    return { ok: false as const, error: "Talep onay bekleyen durumda değil.", status: 409 };
  }

  const now = input.approvedAt ?? new Date();

  // Yeni senaryo: yalnızca kurucu onayı yeterlidir.
  if (input.as === "founder") {
    await db.expenseRequest.updateMany({
      where: { id: input.requestId, status: "PENDING" },
      data: {
        founderApprovedAt: now,
        founderApprovedBy: input.actorId,
        status: "APPROVED",
      },
    });
  } else {
    // Geriye dönük müdür kaydı (tek başına onaylamaz)
    await db.expenseRequest.updateMany({
      where: { id: input.requestId, status: "PENDING" },
      data: {
        principalApprovedAt: now,
        principalApprovedBy: input.actorId,
      },
    });
  }

  const updated = await db.expenseRequest.findFirst({ where: { id: input.requestId } });
  if (updated) {
    await pushFinanceEventToOkul(
      "expense_request.upserted",
      input.tenantId,
      serializeExpenseRequest(updated),
    );
  }
  return { ok: true as const, request: updated };
}

export async function applyExpenseRequestRejection(input: {
  tenantId: string;
  requestId: string;
  actorId: string;
  reason?: string | null;
  rejectedAt?: Date;
}) {
  const db = getTenantDb(input.tenantId);
  const req = await db.expenseRequest.findFirst({ where: { id: input.requestId } });
  if (!req) return { ok: false as const, error: "Talep bulunamadı.", status: 404 };
  if (req.status !== "PENDING") {
    return { ok: false as const, error: "Talep onay bekleyen durumda değil.", status: 409 };
  }

  await db.expenseRequest.updateMany({
    where: { id: input.requestId, status: "PENDING" },
    data: {
      status: "REJECTED",
      rejectedAt: input.rejectedAt ?? new Date(),
      rejectedById: input.actorId,
      rejectReason: input.reason?.trim() || null,
    },
  });

  const updated = await db.expenseRequest.findFirst({ where: { id: input.requestId } });
  if (updated) {
    await pushFinanceEventToOkul(
      "expense_request.upserted",
      input.tenantId,
      serializeExpenseRequest(updated),
    );
  }
  return { ok: true as const, request: updated };
}

/** Muhasebeci tutarı girip harcamayı tamamlar; aylık kasaya gider yazar. */
export async function completeExpenseRequest(input: {
  tenantId: string;
  requestId: string;
  actorId: string;
  amount: number;
  occurredAt: Date;
}) {
  const db = getTenantDb(input.tenantId);
  const req = await db.expenseRequest.findFirst({ where: { id: input.requestId } });
  if (!req) return { ok: false as const, error: "Talep bulunamadı.", status: 404 };
  if (req.status !== "APPROVED") {
    return { ok: false as const, error: "Yalnızca kurucu onaylı talepler tamamlanabilir.", status: 409 };
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false as const, error: "Geçerli bir tutar girin.", status: 400 };
  }

  const now = new Date();
  const yearMonth = toYearMonth(input.occurredAt);
  const amount = new Prisma.Decimal(input.amount.toFixed(2));

  await db.expenseRequest.updateMany({
    where: { id: input.requestId, status: "APPROVED" },
    data: {
      total: amount,
      status: "COMPLETED",
      completedAt: now,
      completedById: input.actorId,
    },
  });

  const cashbook = await db.cashbookEntry.create({
    data: {
      tenantId: input.tenantId,
      side: "EXPENSE",
      yearMonth,
      amount,
      occurredAt: input.occurredAt,
      channel: toCashbookChannel(req.channel),
      expenseTitle: req.title,
      notes: [
        req.notes?.trim() || null,
        req.requesterName ? `Talep eden: ${req.requesterName}` : null,
      ]
        .filter(Boolean)
        .join(" · ") || null,
    },
  });

  const updated = await db.expenseRequest.findFirst({ where: { id: input.requestId } });
  if (updated) {
    await pushFinanceEventToOkul(
      "expense_request.upserted",
      input.tenantId,
      serializeExpenseRequest(updated),
    );
  }
  await pushFinanceEventToOkul(
    "cashbook_entry.upserted",
    input.tenantId,
    serializeCashbookEntry(cashbook),
  );

  return { ok: true as const, request: updated, cashbook };
}

/** Full snapshot for okul backfill / reconcile. */
export async function exportFinanceSnapshot(tenantId: string) {
  const db = getTenantDb(tenantId);
  const [requests, cashbook] = await Promise.all([
    db.expenseRequest.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
    db.cashbookEntry.findMany({ orderBy: { occurredAt: "desc" }, take: 1000 }),
  ]);
  return {
    tenantId,
    exportedAt: new Date().toISOString(),
    expenseRequests: requests.map(serializeExpenseRequest),
    cashbookEntries: cashbook.map(serializeCashbookEntry),
  };
}

export async function resolveDefaultTenantId(explicit?: string | null) {
  if (explicit?.trim()) return explicit.trim();
  if (process.env.SCHOOL_SYNC_TENANT_ID?.trim()) return process.env.SCHOOL_SYNC_TENANT_ID.trim();
  const first = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  return first?.id ?? null;
}
