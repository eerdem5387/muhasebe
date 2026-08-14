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

const monthFmt = new Intl.DateTimeFormat("tr-TR", {
  month: "long",
  year: "numeric",
});

export function fmtMoney(value: string | number | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return tl.format(Number.isFinite(n) ? n : 0);
}

export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "-" : dateFmt.format(d);
}

export function fmtMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return yearMonth;
  return monthFmt.format(new Date(y, m - 1, 1));
}

export function todayISO(): string {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function toYearMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const CHANNEL_TR: Record<string, string> = {
  EFT: "EFT / Havale",
  CREDIT_CARD: "Kredi kartı",
  CHECK: "Çek",
  CASH: "Nakit",
  TRANSFER: "Para transferi",
};

export const ROLE_TR: Record<string, string> = {
  ADMIN: "Yönetici",
  ACCOUNTANT: "Muhasebe",
  PRINCIPAL: "Müdür",
  FOUNDER: "Kurucu",
};

export const STATUS_TR: Record<string, string> = {
  BLOCKED: "Blokeli",
  EXPECTED: "Beklenen",
  REALIZED: "Gerçekleşen",
  ACTIVE: "Aktif",
  CANCELLED: "İptal",
  PENDING: "Onay bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
};
