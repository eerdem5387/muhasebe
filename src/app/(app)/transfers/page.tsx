import { requireAuth } from "@/lib/context";
import { PageHeader, EmptyState } from "@/components/page-header";
import { ExportButton } from "@/components/export-button";
import { TransferForm } from "./transfer-form";
import { fmtDate, fmtMoney } from "@/lib/format";

export default async function TransfersPage() {
  const ctx = await requireAuth();

  const companies = await ctx.db.company.findMany({
    orderBy: { name: "asc" },
    include: {
      accounts: {
        where: { type: { in: ["ASSET"] } },
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true },
      },
    },
  });

  const companyName = new Map(companies.map((c) => [c.id, c.name]));

  const transfers = await ctx.db.intercompanyTransfer.findMany({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return (
    <div>
      <PageHeader
        title="Şirketler Arası Transfer"
        description="Aynı tenant altındaki iki şirket arasında para transferi. Her iki tarafta da otomatik yevmiye fişi kesilir."
        actions={<ExportButton resource="transfers" />}
      />

      {companies.length < 2 ? (
        <EmptyState message="Transfer için en az iki şirket gerekir. Şirketler sayfasından ikinci şirketi ekleyin." />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <TransferForm
            companies={companies.map((c) => ({
              id: c.id,
              name: c.name,
              accounts: c.accounts,
            }))}
          />

          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-800">Geçmiş transferler</h2>
            </div>
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="th">Tarih</th>
                  <th className="th">Yön</th>
                  <th className="th text-right">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.map((t) => (
                  <tr key={t.id}>
                    <td className="td">{fmtDate(t.date)}</td>
                    <td className="td">
                      <div className="text-sm">
                        {companyName.get(t.fromCompanyId) ?? "?"} → {companyName.get(t.toCompanyId) ?? "?"}
                      </div>
                      {t.description ? <div className="text-xs text-slate-400">{t.description}</div> : null}
                    </td>
                    <td className="td text-right font-semibold">{fmtMoney(Number(t.amount))}</td>
                  </tr>
                ))}
                {transfers.length === 0 && (
                  <tr><td className="td text-slate-400" colSpan={3}>Henüz transfer yok.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
