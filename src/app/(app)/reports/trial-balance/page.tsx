import { requireAuth } from "@/lib/context";
import { getTrialBalance } from "@/server/accounting/reports";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Badge } from "@/components/ui";
import { ExportButton } from "@/components/export-button";
import { fmtMoney } from "@/lib/format";

export default async function TrialBalancePage() {
  const ctx = await requireAuth();

  if (!ctx.companyId) {
    return (
      <div>
        <PageHeader title="Mizan" />
        <EmptyState message="Mizanı görmek için önce bir şirket seçin." />
      </div>
    );
  }

  const tb = await getTrialBalance(ctx.db, ctx.companyId);
  const balanced = tb.totalDebit === tb.totalCredit;

  return (
    <div>
      <PageHeader
        title="Mizan"
        description={`${ctx.company?.name} · Hesap bazında borç/alacak toplamları ve bakiyeler.`}
        actions={
          <>
            <Badge color={balanced ? "green" : "red"}>{balanced ? "Mizan dengeli" : "Mizan dengesiz"}</Badge>
            <ExportButton resource="trial-balance" />
          </>
        }
      />

      {tb.rows.length === 0 ? (
        <EmptyState message="Henüz muhasebe hareketi yok." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Kod</th>
                <th className="th">Hesap</th>
                <th className="th text-right">Borç</th>
                <th className="th text-right">Alacak</th>
                <th className="th text-right">Bakiye</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tb.rows.map((r) => (
                <tr key={r.accountId}>
                  <td className="td font-mono text-slate-500">{r.code}</td>
                  <td className="td">{r.name}</td>
                  <td className="td text-right">{fmtMoney(r.debit)}</td>
                  <td className="td text-right">{fmtMoney(r.credit)}</td>
                  <td className="td text-right font-medium">{fmtMoney(r.balance)}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <td className="td" colSpan={2}>Toplam</td>
                <td className="td text-right">{fmtMoney(tb.totalDebit)}</td>
                <td className="td text-right">{fmtMoney(tb.totalCredit)}</td>
                <td className="td text-right">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
