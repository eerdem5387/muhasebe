const tl = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Client-safe money formatter operating on strings/numbers (no Prisma import). */
export function fmtMoney(value: string | number | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return tl.format(Number.isFinite(n) ? n : 0);
}

export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "-" : dateFmt.format(d);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
