import { Prisma } from "@prisma/client";

export type Money = Prisma.Decimal;

/** All monetary values are stored/computed with this scale (matches Decimal(18,4)). */
export const MONEY_SCALE = 4;

/** Rounding used when computing tax / totals (banker-free, standard half-up). */
const ROUNDING = Prisma.Decimal.ROUND_HALF_UP;

export function money(value: Prisma.Decimal.Value): Prisma.Decimal {
  return new Prisma.Decimal(value ?? 0);
}

export const ZERO = new Prisma.Decimal(0);

/** Rounds a value to money scale. */
export function round(value: Prisma.Decimal.Value): Prisma.Decimal {
  return money(value).toDecimalPlaces(MONEY_SCALE, ROUNDING);
}

export function add(...values: Prisma.Decimal.Value[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>((acc, v) => acc.plus(money(v)), ZERO);
}

export function sub(a: Prisma.Decimal.Value, b: Prisma.Decimal.Value): Prisma.Decimal {
  return money(a).minus(money(b));
}

export function mul(a: Prisma.Decimal.Value, b: Prisma.Decimal.Value): Prisma.Decimal {
  return money(a).times(money(b));
}

export function isZero(value: Prisma.Decimal.Value): boolean {
  return money(value).isZero();
}

/** True when two monetary amounts are equal at money scale. */
export function equals(a: Prisma.Decimal.Value, b: Prisma.Decimal.Value): boolean {
  return round(a).equals(round(b));
}

/** Formats a Decimal for display, e.g. "1.234,56" for tr-TR. */
export function formatMoney(
  value: Prisma.Decimal.Value | null | undefined,
  currency = "TRY",
): string {
  const n = value == null ? 0 : money(value).toNumber();
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Serialises Decimal fields to plain strings so they can cross the RSC boundary. */
export function decimalToString(value: Prisma.Decimal.Value | null | undefined): string {
  return value == null ? "0" : money(value).toFixed(2);
}
