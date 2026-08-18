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

export function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
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

export function fmtMonthUpper(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return yearMonth;
  const name = new Intl.DateTimeFormat("tr-TR", { month: "long" }).format(new Date(y, m - 1, 1));
  return `${name.toLocaleUpperCase("tr-TR")}-${y}`;
}

export function shiftYearMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1 + delta, 1);
  return toYearMonth(d);
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
  SUPER_ADMIN: "Süper Admin",
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

export const REGISTRATION_TR: Record<string, string> = {
  NEW: "Yeni kayıt",
  RENEWED: "Kayıt yeniledi",
  NOT_RENEWED: "Kayıt yenilemedi",
};

export const PAYMENT_PROGRESS_TR: Record<string, string> = {
  NOT_STARTED: "Başlamamış",
  IN_PROGRESS: "Devam eden",
  COMPLETED: "Tamamlanan",
};
