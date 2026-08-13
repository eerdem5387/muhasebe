import { requireAuth } from "@/lib/context";
import { createTaxAction, deleteTaxAction } from "@/app/actions/catalog";
import { PageHeader } from "@/components/page-header";
import { ActionForm, MiniForm } from "@/components/action-form";
import { ExportButton } from "@/components/export-button";

export default async function TaxesPage() {
  const ctx = await requireAuth();
  const taxes = await ctx.db.tax.findMany({ orderBy: { rate: "desc" } });

  return (
    <div>
      <PageHeader title="Vergiler" description="KDV ve benzeri vergi oranları. Fatura kalemlerinde seçilir." actions={<ExportButton resource="taxes" />} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="th">Ad</th>
                  <th className="th text-right">Oran (%)</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {taxes.map((t) => (
                  <tr key={t.id}>
                    <td className="td font-medium text-slate-900">{t.name}</td>
                    <td className="td text-right">%{Number(t.rate)}</td>
                    <td className="td text-right">
                      <MiniForm action={deleteTaxAction}>
                        <input type="hidden" name="id" value={t.id} />
                        <button type="submit" className="text-xs font-medium text-red-600 hover:underline">Sil</button>
                      </MiniForm>
                    </td>
                  </tr>
                ))}
                {taxes.length === 0 && (
                  <tr><td className="td text-slate-400" colSpan={3}>Henüz vergi yok.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card h-fit p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Yeni vergi</h2>
          <ActionForm action={createTaxAction} submitLabel="Ekle">
            <div>
              <label className="label" htmlFor="name">Ad</label>
              <input id="name" name="name" className="input" placeholder="KDV %20" required />
            </div>
            <div>
              <label className="label" htmlFor="rate">Oran (%)</label>
              <input id="rate" name="rate" className="input" inputMode="decimal" placeholder="20" required />
            </div>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
