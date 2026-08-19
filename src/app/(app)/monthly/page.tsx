import { requireAuth } from "@/lib/context";
import { PageHeader } from "@/components/page-header";
import { fmtDate, fmtMoney, fmtMonthUpper, toYearMonth } from "@/lib/format";
import { buildExpenseLines, buildIncomeLines, mockMonthlyReport } from "@/server/monthly-report";
import { MonthToolbar } from "./month-toolbar";

function parseMonth(raw: string | undefined): string {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw;
  return toYearMonth(new Date());
}

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const ctx = await requireAuth();
  const month = parseMonth((await searchParams).month);
  const [year, monthNum] = month.split("-").map(Number);
  const start = new Date(year, monthNum - 1, 1);
  const end = new Date(year, monthNum, 1);

  const [collections, expenses] = await Promise.all([
    ctx.db.collection.findMany({
      where: { collectedAt: { gte: start, lt: end } },
      include: { enrollment: { include: { cardBank: { select: { bankName: true } } } } },
      orderBy: { collectedAt: "asc" },
    }),
    ctx.db.expense.findMany({
      where: { spentAt: { gte: start, lt: end } },
      include: { category: { select: { name: true } } },
      orderBy: { spentAt: "asc" },
    }),
  ]);

  const hasRealData = collections.length > 0 || expenses.length > 0;
  const mock = hasRealData ? null : mockMonthlyReport(month);
  const income = hasRealData ? buildIncomeLines(collections) : mock!.income;
  const outgoing = hasRealData ? buildExpenseLines(expenses) : mock!.outgoing;
  const expenseTotal = outgoing.cashTotal + outgoing.cardTotal;
  const net = income.total - expenseTotal;
  const rowCount = Math.max(income.lines.length, outgoing.lines.length, 1);

  return (
    <div>
      <div className="print:hidden">
      <PageHeader
        title="Aylık gelir-gider"
        description="Seçilen ayın tahsilatları ve harcamaları tek tabloda."
        actions={<MonthToolbar month={month} />}
      />
      </div>

      {!hasRealData && (
        <div className="print:hidden mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Bu tablo geçici örnek veriyle dolduruldu. Gerçek tahsilat veya gider kaydı olunca örnek kalkar.
        </div>
      )}
      <div className="monthly-report overflow-x-auto card">
        <div className="border-b border-slate-800 px-4 py-4 text-center">
          <p className="text-sm font-semibold tracking-wide text-slate-500">{ctx.tenantName}</p>
          <h2 className="mt-1 text-xl font-bold uppercase tracking-wide text-slate-900">
            {fmtMonthUpper(month)} tarihli gelir gider ödeme özet tablosu
          </h2>
        </div>

        <table className="w-full min-w-[960px] border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide" colSpan={2}>Gelirler</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide" colSpan={4}>Giderler</th>
            </tr>
            <tr className="border-b border-slate-300 bg-slate-100">
              <th className="th">Açıklama</th>
              <th className="th text-right">Tutar</th>
              <th className="th">Açıklama</th>
              <th className="th text-right">Nakit</th>
              <th className="th text-right">KK harcama</th>
              <th className="th">Tarih</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, i) => {
              const left = income.lines[i];
              const right = outgoing.lines[i];
              return (
                <tr key={i} className="border-b border-slate-200 align-top">
                  <td className={`px-3 py-2 text-sm ${left?.header ? "font-semibold text-slate-900" : "text-slate-700"} ${left?.indent === 2 ? "pl-10 text-slate-500" : left?.indent === 1 ? "pl-7" : ""}`}>
                    {left?.label ?? ""}
                  </td>
                  <td className="td text-right font-medium">
                    {left && left.amount != null ? fmtMoney(left.amount) : ""}
                  </td>
                  <td className={`px-3 py-2 text-sm ${right?.header ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                    {right?.label ?? ""}
                  </td>
                  <td className="td text-right">
                    {right && right.cash ? fmtMoney(right.cash) : ""}
                  </td>
                  <td className="td text-right">
                    {right && right.card ? fmtMoney(right.card) : ""}
                  </td>
                  <td className="td text-slate-500">
                    {right?.date ? fmtDate(right.date) : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-800 bg-slate-50 font-semibold">
              <td className="td">Toplam gelir</td>
              <td className="td text-right">{fmtMoney(income.total)}</td>
              <td className="td">Toplam gider</td>
              <td className="td text-right">{fmtMoney(outgoing.cashTotal)}</td>
              <td className="td text-right">{fmtMoney(outgoing.cardTotal)}</td>
              <td className="td text-right">{fmtMoney(expenseTotal)}</td>
            </tr>
            <tr className="bg-brand-50 font-semibold">
              <td className="td" colSpan={2}>Net (gelir − gider)</td>
              <td className={`td text-right ${net >= 0 ? "text-emerald-700" : "text-red-700"}`} colSpan={4}>
                {fmtMoney(net)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
