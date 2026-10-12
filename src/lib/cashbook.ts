/** Aylık kasa defteri etiketleri ve yardımcılar */

export const INCOME_CATEGORY_TR = {
  STUDENT: "Öğrenci",
  TRIP: "Gezi",
  FOOD: "Yemek",
  OTHER: "Diğer",
} as const;

export const CASHBOOK_CHANNEL_TR = {
  CASH: "Nakit",
  CREDIT_CARD: "Kredi kartı",
  CHECK: "Çek",
} as const;

export type IncomeCategoryKey = keyof typeof INCOME_CATEGORY_TR;
export type CashbookChannelKey = keyof typeof CASHBOOK_CHANNEL_TR;

export function cashbookTitle(entry: {
  side: "INCOME" | "EXPENSE";
  incomeCategory?: IncomeCategoryKey | null;
  payerFirstName?: string | null;
  payerLastName?: string | null;
  expenseTitle?: string | null;
}): string {
  if (entry.side === "EXPENSE") {
    return entry.expenseTitle?.trim() || "Gider";
  }
  const cat = entry.incomeCategory ? INCOME_CATEGORY_TR[entry.incomeCategory] : "Gelir";
  const name = [entry.payerFirstName, entry.payerLastName].filter(Boolean).join(" ").trim();
  return name ? `${cat} · ${name}` : cat;
}
