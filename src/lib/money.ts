/**
 * Türk Lirası tutar parse/format.
 * Görünüm: 19350,50  ·  Kayıt/hesap: 19350.50 (2 ondalık)
 */

const MONEY_RE = /^-?\d+(\.\d{1,2})?$/;

/** Binlik ayırıcıları temizleyip ondalığı noktaya çevirir. Geçersizse null. */
export function parseMoney(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? roundMoney(raw) : null;
  }
  let s = String(raw).trim().replace(/\s/g, "").replace(/₺/g, "").replace(/TL/gi, "");
  if (!s || s === "-" || s === "," || s === ".") return null;

  // TR: 1.234.567,89 → noktalar binlik, virgül ondalık
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if ((s.match(/\./g) ?? []).length > 1) {
    // 1.234.567 → binlik
    s = s.replace(/\./g, "");
  }
  // tek nokta: ondalık (19350.5)

  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return roundMoney(n);
}

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Form / Prisma için "19350.50" */
export function toMoneyCanonical(raw: string | number | null | undefined): string | null {
  const n = parseMoney(raw);
  if (n == null) return null;
  return n.toFixed(2);
}

/** Input görünümü: "19350,50" */
export function formatMoneyInput(raw: string | number | null | undefined): string {
  const n = parseMoney(raw);
  if (n == null) return "0,00";
  const fixed = n.toFixed(2);
  const neg = fixed.startsWith("-");
  const body = neg ? fixed.slice(1) : fixed;
  const [intPart, frac = "00"] = body.split(".");
  return `${neg ? "-" : ""}${intPart},${frac}`;
}

export function splitMoneyParts(raw: string | number | null | undefined): {
  intPart: string;
  fracPart: string;
  negative: boolean;
} {
  const n = parseMoney(raw);
  if (n == null) return { intPart: "0", fracPart: "00", negative: false };
  const fixed = n.toFixed(2);
  const negative = fixed.startsWith("-");
  const body = negative ? fixed.slice(1) : fixed;
  const [intPart, fracPart = "00"] = body.split(".");
  return { intPart, fracPart, negative };
}

export function joinMoneyParts(intPart: string, fracPart: string, negative = false): string {
  const i = (intPart.replace(/\D/g, "") || "0").replace(/^0+(?=\d)/, "") || "0";
  const f = (fracPart.replace(/\D/g, "") + "00").slice(0, 2);
  const canonical = `${negative ? "-" : ""}${i}.${f}`;
  return MONEY_RE.test(canonical) ? Number(canonical).toFixed(2) : "0.00";
}

export function isValidMoneyString(raw: string): boolean {
  return toMoneyCanonical(raw) != null;
}
