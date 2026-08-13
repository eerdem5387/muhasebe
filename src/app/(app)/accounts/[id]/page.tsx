import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/context";
import { getAccountLedger } from "@/server/accounting/reports";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Badge } from "@/components/ui";
import { fmtDate, fmtMoney } from "@/lib/format";

export default async function AccountLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireAuth();
  if (!ctx.companyId) notFound();

  const account = await ctx.db.account.findFirst({ where: { id, companyId: ctx.companyId } });
  if (!account) notFound();

  const ledger = await getAccountLedger(ctx.db, ctx.companyId, id);

  return (
    <div>
      <PageHeader
        title={`${account.code} · ${account.name}`}
        description={`${ctx.company?.name} · Defter-i Kebir (hesap ekstresi)`}
        actions={<Link href="/accounts" className="btn-secondary">Hesap planı</Link>}
      />

      {ledger.rows.length === 0 ? (
        <EmptyState message="Bu hesapta henüz hareket yok." />
      ) : (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <span className="text-sm text-slate-500">Toplam hareket: {ledger.rows.length}</span>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Bakiye:</span>
              <Badge color={Number(ledger.closingBalance) >= 0 ? "green" : "red"}>{fmtMoney(ledger.closingBalance)}</Badge>
            </div>
          </div>
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="th">Tarih</th>
                <th className="th">Açıklama</th>
                <th className="th">Cari</th>
                <th className="th text-right">Borç</th>
                <th className="th text-right">Alacak</th>
                <th className="th text-right">Bakiye</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledger.rows.map((r) => (
                <tr key={r.lineId}>
                  <td className="td">{fmtDate(r.date)}</td>
                  <td className="td">{r.description ?? "-"} <span className="ml-1 text-xs text-slate-400">{r.documentType}</span></td>
                  <td className="td text-slate-500">{r.contactName ?? "-"}</td>
                  <td className="td text-right">{Number(r.debit) ? fmtMoney(r.debit) : "-"}</td>
                  <td className="td text-right">{Number(r.credit) ? fmtMoney(r.credit) : "-"}</td>
                  <td className="td text-right font-medium">{fmtMoney(r.balance)}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <td className="td" colSpan={3}>Toplam</td>
                <td className="td text-right">{fmtMoney(ledger.totalDebit)}</td>
                <td className="td text-right">{fmtMoney(ledger.totalCredit)}</td>
                <td className="td text-right">{fmtMoney(ledger.closingBalance)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
