import Link from "next/link";
import { requireAuth } from "@/lib/context";
import { getAccountTotals, getTrialBalance } from "@/server/accounting/reports";
import { ACCOUNT_CODES } from "@/lib/chart-of-accounts";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui";
import { MonthlyBars, ProportionBar, type MonthPoint } from "@/components/charts";
import { fmtDate, fmtMoney } from "@/lib/format";

const MONTH_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

async function monthlySeries(
  db: Awaited<ReturnType<typeof requireAuth>>["db"],
  companyId: string,
): Promise<MonthPoint[]> {
  const now = new Date();
  const points: MonthPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const totals = await getAccountTotals(db, companyId, { from: start, to: end });
    let income = 0;
    let expense = 0;
    for (const t of totals) {
      if (t.type === "REVENUE") income += Number(t.credit) - Number(t.debit);
      if (t.type === "EXPENSE") expense += Number(t.debit) - Number(t.credit);
    }
    points.push({ label: MONTH_TR[start.getMonth()], income, expense });
  }
  return points;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export default async function DashboardPage() {
  const ctx = await requireAuth();

  const [companyCount, contactCount, productCount] = await Promise.all([
    ctx.db.company.count(),
    ctx.db.contact.count(),
    ctx.db.product.count(),
  ]);

  let invoiceCount = 0;
  let receivable = "0";
  let payable = "0";
  let cash = 0;
  let bank = 0;
  let series: MonthPoint[] = [];
  let recent: { id: string; date: Date; description: string | null; documentType: string; total: number }[] = [];

  if (ctx.companyId) {
    invoiceCount = await ctx.db.invoice.count({ where: { companyId: ctx.companyId } });
    const tb = await getTrialBalance(ctx.db, ctx.companyId);
    receivable = tb.rows.find((r) => r.code === ACCOUNT_CODES.RECEIVABLE)?.balance ?? "0";
    payable = tb.rows.find((r) => r.code === ACCOUNT_CODES.PAYABLE)?.balance ?? "0";
    cash = Number(tb.rows.find((r) => r.code === ACCOUNT_CODES.CASH)?.balance ?? "0");
    bank = Number(tb.rows.find((r) => r.code === ACCOUNT_CODES.BANK)?.balance ?? "0");
    series = await monthlySeries(ctx.db, ctx.companyId);

    const entries = await ctx.db.ledgerEntry.findMany({
      where: { companyId: ctx.companyId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: { lines: true },
    });
    recent = entries.map((e) => ({
      id: e.id,
      date: e.date,
      description: e.description,
      documentType: e.documentType,
      total: e.lines.reduce((sum, l) => sum + Number(l.debit), 0),
    }));
  }

  return (
    <div>
      <PageHeader
        title={`Panel · ${ctx.company?.name ?? "Şirket seçilmedi"}`}
        description={`${ctx.tenantName} organizasyonu`}
      />

      {!ctx.companyId ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Henüz bir şirket oluşturmadınız.{" "}
          <Link href="/companies" className="font-semibold underline">
            Şirketler
          </Link>{" "}
          sayfasından ilk şirketinizi ekleyin.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Şirket" value={String(companyCount)} hint="Grup içi şirket sayısı" />
            <StatCard label="Cari" value={String(contactCount)} hint="Müşteri / tedarikçi / aday" />
            <StatCard label="Ürün & Hizmet" value={String(productCount)} />
            <StatCard label="Fatura" value={String(invoiceCount)} hint="Aktif şirket" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Kasa (100)" value={fmtMoney(cash)} />
            <StatCard label="Banka (102)" value={fmtMoney(bank)} />
            <StatCard label="Toplam Alacak (120)" value={fmtMoney(receivable)} hint="Alıcılar bakiyesi" />
            <StatCard label="Toplam Borç (320)" value={fmtMoney(payable)} hint="Satıcılar (negatif = borç)" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="card p-5 lg:col-span-2">
              <h2 className="mb-4 font-semibold text-slate-800">Son 6 Ay · Gelir / Gider</h2>
              <MonthlyBars data={series} />
            </div>
            <div className="card p-5">
              <h2 className="mb-4 font-semibold text-slate-800">Nakit Pozisyonu</h2>
              <ProportionBar
                segments={[
                  { label: "Kasa", value: cash, color: "#1d4ed8" },
                  { label: "Banka", value: bank, color: "#0ea5e9" },
                ]}
              />
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-sm text-slate-500">Toplam likidite</p>
                <p className="text-xl font-bold text-slate-900">{fmtMoney(cash + bank)}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 card">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-800">Son Yevmiye Fişleri</h2>
              <Link href="/journal" className="text-sm font-medium text-brand-600 hover:underline">
                Tümünü gör
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">Henüz hareket yok.</p>
            ) : (
              <table className="w-full">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="th">Tarih</th>
                    <th className="th">Açıklama</th>
                    <th className="th">Tür</th>
                    <th className="th text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recent.map((e) => (
                    <tr key={e.id}>
                      <td className="td">{fmtDate(e.date)}</td>
                      <td className="td">{e.description ?? "-"}</td>
                      <td className="td"><Badge color="blue">{e.documentType}</Badge></td>
                      <td className="td text-right font-medium">{fmtMoney(e.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
