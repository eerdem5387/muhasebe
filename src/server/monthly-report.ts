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
