import { fmtMoney } from "@/lib/format";

export interface MonthPoint {
  label: string;
  income: number;
  expense: number;
}

/** Simple grouped bar chart (income vs expense) rendered as inline SVG. */
export function MonthlyBars({ data }: { data: MonthPoint[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const barW = 14;
  const gap = 10;
  const groupW = barW * 2 + gap;
  const chartH = 160;
  const width = data.length * (groupW + 24);

  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(width, 320)} height={chartH + 40} role="img" aria-label="Aylık gelir gider grafiği">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={0} x2={Math.max(width, 320)} y1={chartH - chartH * f} y2={chartH - chartH * f} stroke="#e2e8f0" strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const x = i * (groupW + 24) + 12;
          const inH = (d.income / max) * chartH;
          const exH = (d.expense / max) * chartH;
          return (
            <g key={d.label}>
              <rect x={x} y={chartH - inH} width={barW} height={inH} rx={3} fill="#10b981">
                <title>{`${d.label} Gelir: ${fmtMoney(d.income)}`}</title>
              </rect>
              <rect x={x + barW + 4} y={chartH - exH} width={barW} height={exH} rx={3} fill="#f59e0b">
                <title>{`${d.label} Gider: ${fmtMoney(d.expense)}`}</title>
              </rect>
              <text x={x + barW} y={chartH + 16} textAnchor="middle" fontSize={11} fill="#64748b">{d.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-emerald-500" /> Gelir</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-amber-500" /> Gider</span>
      </div>
    </div>
  );
}

/** Horizontal proportion bar for a couple of categories. */
export function ProportionBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = Math.max(1, segments.reduce((s, x) => s + Math.abs(x.value), 0));
  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100">
        {segments.map((s) => (
          <div key={s.label} style={{ width: `${(Math.abs(s.value) / total) * 100}%`, backgroundColor: s.color }} />
        ))}
      </div>
      <div className="mt-2 space-y-1 text-xs text-slate-500">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} /> {s.label}</span>
            <span>{fmtMoney(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
