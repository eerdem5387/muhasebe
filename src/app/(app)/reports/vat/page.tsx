import { requireAuth } from "@/lib/context";
import { getVatSummary } from "@/server/accounting/reports";
import { PageHeader, EmptyState } from "@/components/page-header";
import { ExportButton } from "@/components/export-button";
import { fmtMoney } from "@/lib/format";

export default async function VatPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const ctx = await requireAuth();
  const { from, to } = await searchParams;

  if (!ctx.companyId) {
    return (
      <div>
        <PageHeader title="KDV Beyanı" />
        <EmptyState message="Önce bir şirket seçin." />
      </div>
    );
  }

  const range = {
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  };
  const vat = await getVatSummary(ctx.db, ctx.companyId, range);
  const payable = Number(vat.payable);

  return (
    <div>
      <PageHeader
        title="KDV Beyanı"
        description={`${ctx.company?.name} · Hesaplanan (391) ve İndirilecek (191) KDV özeti.`}
        actions={<ExportButton resource="vat" query={{ ...(from ? { from } : {}), ...(to ? { to } : {}) }} />}
      />

      <form className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label" htmlFor="from">Başlangıç</label>
          <input id="from" name="from" type="date" className="input" defaultValue={from} />
        </div>
        <div>
          <label className="label" htmlFor="to">Bitiş</label>
          <input id="to" name="to" type="date" className="input" defaultValue={to} />
        </div>
        <button type="submit" className="btn-primary">Uygula</button>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-slate-500">Hesaplanan KDV (391)</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{fmtMoney(vat.outputVat)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">İndirilecek KDV (191)</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{fmtMoney(vat.deductibleVat)}</p>
        </div>
        <div className={`card p-5 ${payable >= 0 ? "bg-red-50" : "bg-emerald-50"}`}>
          <p className="text-sm text-slate-500">{payable >= 0 ? "Ödenecek KDV" : "Devreden KDV"}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{fmtMoney(Math.abs(payable))}</p>
        </div>
      </div>
    </div>
  );
}
