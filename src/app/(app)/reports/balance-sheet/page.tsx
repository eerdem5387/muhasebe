import { requireAuth } from "@/lib/context";
import { getBalanceSheet } from "@/server/accounting/reports";
import { PageHeader, EmptyState } from "@/components/page-header";
import { ExportButton } from "@/components/export-button";
import { Badge } from "@/components/ui";
import { fmtMoney } from "@/lib/format";
import type { StatementLineRow } from "@/server/accounting/reports";

function Section({ title, rows, total, tone }: { title: string; rows: StatementLineRow[]; total: string; tone: string }) {
  return (
    <div className="card overflow-hidden">
      <div className={`border-b border-slate-200 px-5 py-3 font-semibold ${tone}`}>{title}</div>
      <table className="w-full">
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.code}><td className="td font-mono text-slate-500">{r.code}</td><td className="td">{r.name}</td><td className="td text-right">{fmtMoney(r.amount)}</td></tr>
          ))}
          {rows.length === 0 && <tr><td className="td text-slate-400" colSpan={3}>Kayıt yok.</td></tr>}
          <tr className="bg-slate-50 font-semibold"><td className="td" colSpan={2}>Toplam</td><td className="td text-right">{fmtMoney(total)}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

export default async function BalanceSheetPage() {
  const ctx = await requireAuth();

  if (!ctx.companyId) {
    return (
      <div>
        <PageHeader title="Bilanço" />
        <EmptyState message="Önce bir şirket seçin." />
      </div>
    );
  }

  const bs = await getBalanceSheet(ctx.db, ctx.companyId);
  const liabPlusEquity = Number(bs.totalLiabilities) + Number(bs.totalEquity);
  const balanced = Math.abs(Number(bs.totalAssets) - liabPlusEquity) < 0.01;

  return (
    <div>
      <PageHeader
        title="Bilanço"
        description={`${ctx.company?.name} · Aktif = Pasif denkliği.`}
        actions={
          <>
            <Badge color={balanced ? "green" : "red"}>{balanced ? "Denk" : "Denk değil"}</Badge>
            <ExportButton resource="balance-sheet" />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="AKTİF (Varlıklar)" rows={bs.assets} total={bs.totalAssets} tone="bg-blue-50 text-blue-800" />
        <div className="space-y-6">
          <Section title="PASİF (Yükümlülükler)" rows={bs.liabilities} total={bs.totalLiabilities} tone="bg-amber-50 text-amber-800" />
          <Section title="ÖZKAYNAKLAR" rows={bs.equity} total={bs.totalEquity} tone="bg-emerald-50 text-emerald-800" />
        </div>
      </div>

      <div className="card mt-6 flex items-center justify-between p-5">
        <span className="font-semibold text-slate-700">Aktif Toplamı</span>
        <span className="text-xl font-bold text-slate-900">{fmtMoney(bs.totalAssets)}</span>
        <span className="font-semibold text-slate-700">Pasif + Özkaynak</span>
        <span className="text-xl font-bold text-slate-900">{fmtMoney(liabPlusEquity)}</span>
      </div>
    </div>
  );
}
