import { CASHBOOK_CHANNEL_TR, type CashbookChannelKey } from "@/lib/cashbook";
import { fmtMoney } from "@/lib/format";
import type { MonthlyLedgerRow } from "@/server/monthly-ledger";

const CHANNEL_ORDER: CashbookChannelKey[] = [
  "BANK",
  "CREDIT_CARD",
  "CASH",
  "CHECK",
  "PROMISSORY",
];

const ACCENT: Record<CashbookChannelKey, string> = {
  BANK: "border-sky-200 bg-sky-50 text-sky-900",
  CREDIT_CARD: "border-violet-200 bg-violet-50 text-violet-900",
  CASH: "border-emerald-200 bg-emerald-50 text-emerald-900",
  CHECK: "border-amber-200 bg-amber-50 text-amber-900",
  PROMISSORY: "border-rose-200 bg-rose-50 text-rose-900",
};

export function ChannelSpendCard({ expenseRows }: { expenseRows: MonthlyLedgerRow[] }) {
  const totals = new Map<string, number>();
  for (const row of expenseRows) {
    if (row.tag === "PLANNED") continue;
    const key = row.channel ?? row.channelLabel ?? "OTHER";
    totals.set(key, (totals.get(key) ?? 0) + row.amount);
  }

  const items = CHANNEL_ORDER.map((channel) => ({
    channel,
    label: CASHBOOK_CHANNEL_TR[channel],
    amount: totals.get(channel) ?? 0,
  })).filter((i) => i.amount > 0);

  // Bilinmeyen / eski kanal etiketleri
  for (const [key, amount] of totals) {
    if ((CHANNEL_ORDER as string[]).includes(key)) continue;
    if (amount <= 0) continue;
    items.push({
      channel: key as CashbookChannelKey,
      label: CASHBOOK_CHANNEL_TR[key as CashbookChannelKey] ?? key,
      amount,
    });
  }

  const grand = items.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="card mt-4 overflow-hidden print:break-inside-avoid">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Kanala göre harcama</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Bu ay giderlerin ödeme kanallarına göre dağılımı
        </p>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-400">Bu ay kanal bazlı harcama yok.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {items.map((item) => (
            <div
              key={item.channel}
              className={`rounded-xl border px-3.5 py-3 ${ACCENT[item.channel] ?? "border-slate-200 bg-slate-50 text-slate-900"}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
                {item.label}
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums">{fmtMoney(item.amount)}</p>
              {grand > 0 ? (
                <p className="mt-0.5 text-[11px] opacity-60">
                  %{Math.round((item.amount / grand) * 100)}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {grand > 0 ? (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-right text-sm font-semibold text-slate-800">
          Toplam harcama: {fmtMoney(grand)}
        </div>
      ) : null}
    </div>
  );
}
