import Link from "next/link";
import { requireAuth } from "@/lib/context";
import { getAging } from "@/server/accounting/reports";
import { PageHeader, EmptyState } from "@/components/page-header";
import { ExportButton } from "@/components/export-button";
import { fmtMoney } from "@/lib/format";

export default async function AgingPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const ctx = await requireAuth();
  const { kind } = await searchParams;
  const isPayable = kind === "PAYABLE";
  const type = isPayable ? "PAYABLE" : "RECEIVABLE";

  if (!ctx.companyId) {
    return (
      <div>
        <PageHeader title="Cari Yaşlandırma" />
        <EmptyState message="Önce bir şirket seçin." />
      </div>
    );
  }

  const rows = await getAging(ctx.db, ctx.companyId, type);
  const totals = rows.reduce(
    (s, r) => ({ b0: s.b0 + r.b0_30, b1: s.b1 + r.b31_60, b2: s.b2 + r.b61_90, b3: s.b3 + r.b90plus, t: s.t + r.total }),
    { b0: 0, b1: 0, b2: 0, b3: 0, t: 0 },
  );

  return (
    <div>
      <PageHeader
        title="Cari Yaşlandırma"
        description={`${ctx.company?.name} · ${isPayable ? "Satıcı (320) borçları" : "Alıcı (120) alacakları"} · FIFO vade analizi.`}
        actions={<ExportButton resource={isPayable ? "aging-payable" : "aging-receivable"} />}
      />

      <div className="mb-4 flex gap-2">
        <Link href="/reports/aging?kind=RECEIVABLE" className={!isPayable ? "btn-primary" : "btn-secondary"}>Alacaklar</Link>
        <Link href="/reports/aging?kind=PAYABLE" className={isPayable ? "btn-primary" : "btn-secondary"}>Borçlar</Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState message="Açık bakiye bulunamadı." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Cari</th>
                <th className="th text-right">0-30 gün</th>
                <th className="th text-right">31-60 gün</th>
                <th className="th text-right">61-90 gün</th>
                <th className="th text-right">90+ gün</th>
                <th className="th text-right">Toplam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.contactId}>
                  <td className="td font-medium text-slate-900">{r.contactName}</td>
                  <td className="td text-right">{fmtMoney(r.b0_30)}</td>
                  <td className="td text-right">{fmtMoney(r.b31_60)}</td>
                  <td className="td text-right">{fmtMoney(r.b61_90)}</td>
                  <td className="td text-right text-red-600">{fmtMoney(r.b90plus)}</td>
                  <td className="td text-right font-semibold">{fmtMoney(r.total)}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <td className="td">Toplam</td>
                <td className="td text-right">{fmtMoney(totals.b0)}</td>
                <td className="td text-right">{fmtMoney(totals.b1)}</td>
                <td className="td text-right">{fmtMoney(totals.b2)}</td>
                <td className="td text-right">{fmtMoney(totals.b3)}</td>
                <td className="td text-right">{fmtMoney(totals.t)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
