import "server-only";
import { prisma, getTenantDb } from "@/lib/prisma";
import {
  pushFinanceEventToOkul,
  serializeCashbookEntry,
  serializeExpenseRequest,
} from "@/server/okul-webhook";

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
  let principalApprovedAt = req.principalApprovedAt;
  let principalApprovedBy = req.principalApprovedBy;
  let founderApprovedAt = req.founderApprovedAt;
  let founderApprovedBy = req.founderApprovedBy;

  if (input.as === "principal") {
    principalApprovedAt = now;
    principalApprovedBy = input.actorId;
  } else {
    founderApprovedAt = now;
    founderApprovedBy = input.actorId;
  }

  const both = Boolean(principalApprovedAt && founderApprovedAt);
  await db.expenseRequest.updateMany({
    where: { id: input.requestId },
    data: {
      principalApprovedAt,
      principalApprovedBy,
      founderApprovedAt,
      founderApprovedBy,
      status: both ? "APPROVED" : "PENDING",
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
