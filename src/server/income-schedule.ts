import { Prisma } from "@prisma/client";
import { toYearMonth } from "@/lib/format";

export const INSTALLMENT_INTERVAL_DAYS = 30;

export {
  ECOM_CHANNELS,
  isEcommerceEligibleCategory,
  isEcomChannel,
  resolveEcomPlanRules,
  type EcomChannel,
} from "@/lib/ecommerce-channels";

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

/**
 * E-Ticaret Ziraat 2 Taksit: tutarın yarısı +28 gün, diğer yarısı +56 gün.
 * Diğer e-ticaret kanalları: tek satır, ilgili bloke günü.
 */
export function buildPlanSchedule(input: {
  amount: Prisma.Decimal.Value;
  paymentDate: Date;
  paymentChannel: string;
  installmentCount: number;
  blockDays: number;
}): ScheduleDraft[] {
  if (input.paymentChannel === "ECOM_ZIRAAT_2X") {
    const fee = new Prisma.Decimal(input.amount);
    const first = fee.div(2).toDecimalPlaces(2);
    const second = fee.minus(first);
    const d1 = addDays(input.paymentDate, 28);
    const d2 = addDays(input.paymentDate, 56);
    return [
      { installmentIndex: 1, amount: first, releaseDate: d1, yearMonth: toYearMonth(d1) },
      { installmentIndex: 2, amount: second, releaseDate: d2, yearMonth: toYearMonth(d2) },
    ];
  }

  if (input.paymentChannel === "ECOM_ZIRAAT") {
    return buildIncomeSchedule({
      annualFee: input.amount,
      installmentCount: 1,
      paymentDate: input.paymentDate,
      blockDays: 28,
    });
  }

  if (input.paymentChannel === "ECOM_OTHER_BANKS") {
    return buildIncomeSchedule({
      annualFee: input.amount,
      installmentCount: 1,
      paymentDate: input.paymentDate,
      blockDays: 39,
    });
  }

  return buildIncomeSchedule({
    annualFee: input.amount,
    installmentCount: input.installmentCount,
    paymentDate: input.paymentDate,
    blockDays: input.blockDays,
  });
}

export function scheduleStatus(releaseDate: Date, hasCollection: boolean, now = new Date()): "BLOCKED" | "EXPECTED" | "REALIZED" {
  if (releaseDate.getTime() > now.getTime()) return "BLOCKED";
  if (hasCollection) return "REALIZED";
  return "EXPECTED";
}
