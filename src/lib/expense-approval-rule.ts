/**
 * Harcama talebi onay kuralı.
 *
 * - Tutar 5.000 ₺ üzerindeyse hem kurucu hem müdür onayı gerekir.
 * - 5.000 ₺ ve altında ya da tutar girilmemişse kurucu veya müdürden birinin onayı yeterlidir.
 *
 * Okul paneli (okul-yonetim-sistemi/web) aynı eşiği `src/lib/finance/expense-approval.ts`
 * içinde kullanır; değiştirirken ikisini birlikte güncelleyin.
 */
export const DUAL_APPROVAL_THRESHOLD_TRY = 5000;

export type ApprovalSlot = "founder" | "principal";

type Amount = { toString(): string } | number | null | undefined;

export function requiresDualApproval(total: Amount): boolean {
  if (total == null) return false;
  const n = Number(total.toString());
  if (!Number.isFinite(n)) return false;
  return n > DUAL_APPROVAL_THRESHOLD_TRY;
}

export function isApprovalSatisfied(row: {
  total: Amount;
  founderApprovedAt: Date | null;
  principalApprovedAt: Date | null;
}): boolean {
  const founder = row.founderApprovedAt != null;
  const principal = row.principalApprovedAt != null;
  return requiresDualApproval(row.total) ? founder && principal : founder || principal;
}

export type ApprovalProgress = {
  rule: "dual" | "single";
  /** Çift onaylı talepte tek onay gelmiş, diğeri bekleniyor */
  partial: boolean;
  /** Kısmi onayda beklenen rol */
  waitingFor: ApprovalSlot | null;
};

export function approvalProgress(row: {
  status: string;
  total: Amount;
  founderApprovedAt: Date | null;
  principalApprovedAt: Date | null;
}): ApprovalProgress {
  const rule = requiresDualApproval(row.total) ? "dual" : "single";
  const founder = row.founderApprovedAt != null;
  const principal = row.principalApprovedAt != null;
  const partial = row.status === "PENDING" && rule === "dual" && founder !== principal;
  return {
    rule,
    partial,
    waitingFor: partial ? (founder ? "principal" : "founder") : null,
  };
}
