import { Prisma } from "@prisma/client";
import { toYearMonth } from "@/lib/format";

export const INSTALLMENT_INTERVAL_DAYS = 30;

export interface ScheduleDraft {
  installmentIndex: number;
  amount: Prisma.Decimal;
  releaseDate: Date;
  yearMonth: string;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Splits an annual fee into installments and shifts each slice by the bank
 * block period so the monthly income table shows when cash actually lands.
 */
export function buildIncomeSchedule(input: {
  annualFee: Prisma.Decimal.Value;
  installmentCount: number;
  paymentDate: Date;
  blockDays: number;
}): ScheduleDraft[] {
  const count = Math.max(1, Math.floor(input.installmentCount));
  const fee = new Prisma.Decimal(input.annualFee);
  const base = fee.div(count).toDecimalPlaces(2);
  const lines: ScheduleDraft[] = [];
  let allocated = new Prisma.Decimal(0);

  for (let i = 0; i < count; i++) {
    const amount = i === count - 1 ? fee.minus(allocated) : base;
    allocated = allocated.plus(amount);
    const releaseDate = addDays(input.paymentDate, i * INSTALLMENT_INTERVAL_DAYS + input.blockDays);
    lines.push({
      installmentIndex: i + 1,
      amount,
      releaseDate,
      yearMonth: toYearMonth(releaseDate),
    });
  }
  return lines;
}

export function scheduleStatus(releaseDate: Date, hasCollection: boolean, now = new Date()): "BLOCKED" | "EXPECTED" | "REALIZED" {
  if (releaseDate.getTime() > now.getTime()) return "BLOCKED";
  if (hasCollection) return "REALIZED";
  return "EXPECTED";
}
