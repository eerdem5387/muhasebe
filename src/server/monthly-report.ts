import type { PaymentChannel, RequestChannel } from "@prisma/client";
import { CHANNEL_TR } from "@/lib/format";

export type IncomeLine = {
  key: string;
  label: string;
  amount: number | null;
  indent: number;
  header?: boolean;
};

export type ExpenseLine = {
  key: string;
  label: string;
  cash: number | null;
  card: number | null;
  date: Date | null;
  header?: boolean;
};

const CHANNEL_ORDER: PaymentChannel[] = ["CASH", "CREDIT_CARD", "EFT", "CHECK"];

export function buildIncomeLines(
  collections: Array<{
    id: string;
    amount: unknown;
    paymentChannel: PaymentChannel;
    enrollment: { cardBank: { bankName: string } | null };
  }>,
): { lines: IncomeLine[]; total: number } {
  const lines: IncomeLine[] = [];
  let total = 0;
  const byChannel = new Map<PaymentChannel, number>();
  const cardByBank = new Map<string, number>();

  for (const row of collections) {
    const amount = Number(row.amount);
    total += amount;
    byChannel.set(row.paymentChannel, (byChannel.get(row.paymentChannel) ?? 0) + amount);
    if (row.paymentChannel === "CREDIT_CARD") {
      const bank = row.enrollment.cardBank?.bankName ?? "Diğer kart";
      cardByBank.set(bank, (cardByBank.get(bank) ?? 0) + amount);
    }
  }

  lines.push({ key: "inc-head", label: "Öğrenci gelirleri", amount: null, indent: 0, header: true });
  for (const channel of CHANNEL_ORDER) {
    const amount = byChannel.get(channel) ?? 0;
    if (amount <= 0 && channel !== "CASH" && channel !== "CREDIT_CARD") continue;
    lines.push({
      key: `ch-${channel}`,
      label: CHANNEL_TR[channel] ?? channel,
      amount,
      indent: 1,
    });
    if (channel === "CREDIT_CARD") {
      for (const [bank, bankAmount] of [...cardByBank.entries()].sort((a, b) => a[0].localeCompare(b[0], "tr"))) {
        lines.push({ key: `bank-${bank}`, label: bank, amount: bankAmount, indent: 2 });
      }
    }
  }

  return { lines, total };
}

export function buildExpenseLines(
  expenses: Array<{
    id: string;
    amount: unknown;
    spentAt: Date;
    channel: RequestChannel | null;
    notes: string | null;
    category: { name: string };
  }>,
): { lines: ExpenseLine[]; cashTotal: number; cardTotal: number } {
  const grouped = new Map<string, typeof expenses>();
  for (const row of expenses) {
    const list = grouped.get(row.category.name) ?? [];
    list.push(row);
    grouped.set(row.category.name, list);
  }

  const lines: ExpenseLine[] = [];
  let cashTotal = 0;
  let cardTotal = 0;

  for (const [category, rows] of [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0], "tr"))) {
    lines.push({ key: `cat-${category}`, label: category, cash: null, card: null, date: null, header: true });
    for (const row of rows) {
      const amount = Number(row.amount);
      const isCard = row.channel === "CREDIT_CARD";
      if (isCard) cardTotal += amount;
      else cashTotal += amount;
      lines.push({
        key: row.id,
        label: row.notes?.trim() || category,
        cash: isCard ? 0 : amount,
        card: isCard ? amount : 0,
        date: row.spentAt,
      });
    }
  }

  return { lines, cashTotal, cardTotal };
}

/** TODO(mock): Aylık tabloyu doldurmak için geçici örnek. Gerçek veri gelince bu bloğu silin. */
export function mockMonthlyReport(month: string): {
  income: { lines: IncomeLine[]; total: number };
  outgoing: { lines: ExpenseLine[]; cashTotal: number; cardTotal: number };
} {
  const [year, monthNum] = month.split("-").map(Number);
  const d = (day: number) => new Date(year, (monthNum || 1) - 1, day);

  return {
    income: {
      total: 939791.34,
      lines: [
        { key: "mock-inc-head", label: "Öğrenci gelirleri", amount: null, indent: 0, header: true },
        { key: "mock-cash", label: "Nakit", amount: 185000, indent: 1 },
        { key: "mock-cc", label: "Kredi kartı", amount: 412500, indent: 1 },
        { key: "mock-ziraat", label: "Ziraat Bankası", amount: 240000, indent: 2 },
        { key: "mock-akbank", label: "Akbank", amount: 112500, indent: 2 },
        { key: "mock-isbank", label: "İş Bankası", amount: 60000, indent: 2 },
        { key: "mock-eft", label: "EFT / Havale", amount: 278291.34, indent: 1 },
        { key: "mock-check", label: "Çek", amount: 64000, indent: 1 },
      ],
    },
    outgoing: {
      cashTotal: 821500,
      cardTotal: 18242,
      lines: [
        { key: "mock-exp-personel", label: "Personel giderleri", cash: null, card: null, date: null, header: true },
        { key: "mock-maas", label: "Toplu maaşlar", cash: 420000, card: 0, date: d(5) },
        { key: "mock-ders", label: "Ek ders ücretleri", cash: 38500, card: 0, date: d(12) },
        { key: "mock-exp-sabit", label: "Sabit giderler", cash: null, card: null, date: null, header: true },
        { key: "mock-elektrik", label: "Elektrik", cash: 24600, card: 0, date: d(8) },
        { key: "mock-dogalgaz", label: "Doğalgaz", cash: 18900, card: 0, date: d(8) },
        { key: "mock-internet", label: "Internet / telefon", cash: 0, card: 4250, date: d(10) },
        { key: "mock-exp-kira", label: "Kira ve devlet ödemeleri", cash: null, card: null, date: null, header: true },
        { key: "mock-kira", label: "Kira", cash: 150000, card: 0, date: d(3) },
        { key: "mock-sgk", label: "SGK", cash: 98000, card: 0, date: d(15) },
        { key: "mock-vergi", label: "Vergi / KDV", cash: 41200, card: 0, date: d(20) },
        { key: "mock-exp-diger", label: "Diğer giderler", cash: null, card: null, date: null, header: true },
        { key: "mock-temizlik", label: "Temizlik malzemesi", cash: 6800, card: 0, date: d(7) },
        { key: "mock-reklam", label: "Reklam", cash: 0, card: 8900, date: d(14) },
        { key: "mock-tamir", label: "Kazan tamiri", cash: 12500, card: 0, date: d(18) },
        { key: "mock-kirtasiye", label: "Kırtasiye", cash: 0, card: 5092, date: d(22) },
        { key: "mock-yakit", label: "Personel servis yakıt", cash: 11000, card: 0, date: d(25) },
      ],
    },
  };
}
