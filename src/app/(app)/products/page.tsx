import { requireAuth } from "@/lib/context";
import { createProductAction, deleteProductAction } from "@/app/actions/catalog";
import { PageHeader } from "@/components/page-header";
import { ActionForm, MiniForm } from "@/components/action-form";
import { Badge } from "@/components/ui";
import { ExportButton } from "@/components/export-button";
import { fmtMoney } from "@/lib/format";

export default async function ProductsPage() {
  const ctx = await requireAuth();
  const products = await ctx.db.product.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader title="Ürün & Hizmet" description="Fatura kalemlerinde kullanılan ürün ve hizmet kartları." actions={<ExportButton resource="products" />} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="th">Ad</th>
                  <th className="th">Tür</th>
                  <th className="th">Birim</th>
                  <th className="th text-right">Fiyat</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="td font-medium text-slate-900">{p.name}</td>
                    <td className="td">
                      <Badge color={p.type === "SERVICE" ? "blue" : "gray"}>
                        {p.type === "SERVICE" ? "Hizmet" : "Ürün"}
                      </Badge>
                    </td>
                    <td className="td">{p.unit}</td>
                    <td className="td text-right">{fmtMoney(Number(p.defaultPrice))}</td>
                    <td className="td text-right">
                      <MiniForm action={deleteProductAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="text-xs font-medium text-red-600 hover:underline">Sil</button>
                      </MiniForm>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr><td className="td text-slate-400" colSpan={5}>Henüz kayıt yok.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card h-fit p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Yeni ürün / hizmet</h2>
          <ActionForm action={createProductAction} submitLabel="Ekle">
            <div>
              <label className="label" htmlFor="name">Ad</label>
              <input id="name" name="name" className="input" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="type">Tür</label>
                <select id="type" name="type" className="input" defaultValue="PRODUCT">
                  <option value="PRODUCT">Ürün</option>
                  <option value="SERVICE">Hizmet</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="unit">Birim</label>
                <input id="unit" name="unit" className="input" defaultValue="adet" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="defaultPrice">Varsayılan fiyat</label>
              <input id="defaultPrice" name="defaultPrice" className="input" inputMode="decimal" defaultValue="0" required />
            </div>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
