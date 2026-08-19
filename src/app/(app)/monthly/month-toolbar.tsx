"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { fmtMonthUpper, shiftYearMonth } from "@/lib/format";

export function MonthToolbar({ month, extra }: { month: string; extra?: ReactNode }) {
  const prev = shiftYearMonth(month, -1);
  const next = shiftYearMonth(month, 1);

  return (
    <div className="print:hidden flex flex-wrap items-center gap-2">
      <Link href={`/monthly?month=${prev}`} className="btn-secondary">‹ {fmtMonthUpper(prev)}</Link>
      <Link href={`/monthly?month=${next}`} className="btn-secondary">{fmtMonthUpper(next)} ›</Link>
      {extra}
      <button type="button" className="btn-primary" onClick={() => window.print()}>Yazdır</button>
    </div>
  );
}
