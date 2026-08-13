import { requireAuth } from "@/lib/context";
import { getIncomeStatement } from "@/server/accounting/reports";
import { PageHeader, EmptyState } from "@/components/page-header";
import { ExportButton } from "@/components/export-button";
import { fmtMoney } from "@/lib/format";

export default async function IncomeStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const ctx = await requireAuth();
  const { from, to } = await searchParams;

  if (!ctx.companyId) {
    return (
      <div>
        <PageHeader title="Gelir Tablosu (Kâr/Zarar)" />
        <EmptyState message="Önce bir şirket seçin." />
      </div>
    );
  }

  const range = { from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined };
  const rep = await getIncomeStatement(ctx.db, ctx.companyId, range);
  const profit = Number(rep.netProfit);

  return (
    <div>
      <PageHeader
        title="Gelir Tablosu (Kâr/Zarar)"
        description={`${ctx.company?.name} · Gelir ve gider hesaplarının dönem özeti.`}
        actions={<ExportButton resource="income-statement" query={{ ...(from ? { from } : {}), ...(to ? { to } : {}) }} />}
      />

      <form className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div><label className="label" htmlFor="from">Başlangıç</label><input id="from" name="from" type="date" className="input" defaultValue={from} /></div>
        <div><label className="label" htmlFor="to">Bitiş</label><input id="to" name="to" type="date" className="input" defaultValue={to} /></div>
        <button type="submit" className="btn-primary">Uygula</button>
      </form>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 bg-emerald-50 px-5 py-3 font-semibold text-emerald-800">Gelirler</div>
          <table className="w-full">
            <tbody className="divide-y divide-slate-100">
              {rep.revenues.map((r) => (
                <tr key={r.code}><td className="td font-mono text-slate-500">{r.code}</td><td className="td">{r.name}</td><td className="td text-right">{fmtMoney(r.amount)}</td></tr>
              ))}
              {rep.revenues.length === 0 && <tr><td className="td text-slate-400" colSpan={3}>Kayıt yok.</td></tr>}
              <tr className="bg-slate-50 font-semibold"><td className="td" colSpan={2}>Toplam Gelir</td><td className="td text-right">{fmtMoney(rep.totalRevenue)}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 bg-amber-50 px-5 py-3 font-semibold text-amber-800">Giderler</div>
          <table className="w-full">
            <tbody className="divide-y divide-slate-100">
              {rep.expenses.map((r) => (
                <tr key={r.code}><td className="td font-mono text-slate-500">{r.code}</td><td className="td">{r.name}</td><td className="td text-right">{fmtMoney(r.amount)}</td></tr>
              ))}
              {rep.expenses.length === 0 && <tr><td className="td text-slate-400" colSpan={3}>Kayıt yok.</td></tr>}
              <tr className="bg-slate-50 font-semibold"><td className="td" colSpan={2}>Toplam Gider</td><td className="td text-right">{fmtMoney(rep.totalExpense)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={`card mt-6 flex items-center justify-between p-5 ${profit >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
        <span className="text-lg font-semibold text-slate-700">Dönem Net {profit >= 0 ? "Kârı" : "Zararı"}</span>
        <span className="text-2xl font-bold text-slate-900">{fmtMoney(Math.abs(profit))}</span>
      </div>
    </div>
  );
}
