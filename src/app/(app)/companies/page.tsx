import Link from "next/link";
import { requireAuth } from "@/lib/context";
import { createCompanyAction } from "@/app/actions/company";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { CompanyFields } from "./company-fields";

export default async function CompaniesPage() {
  const ctx = await requireAuth();
  const companies = await ctx.db.company.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { accounts: true, invoices: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Şirketler"
        description="Bu organizasyona (tenant) bağlı grup şirketleri. Her yeni şirkete varsayılan hesap planı otomatik tanımlanır."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="th">Şirket</th>
                  <th className="th">VKN</th>
                  <th className="th">Vergi Dairesi</th>
                  <th className="th text-right">Hesap</th>
                  <th className="th text-right">Fatura</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((c) => (
                  <tr key={c.id}>
                    <td className="td font-medium text-slate-900">{c.name}</td>
                    <td className="td">{c.taxNumber ?? "-"}</td>
                    <td className="td">{c.taxOffice ?? "-"}</td>
                    <td className="td text-right">{c._count.accounts}</td>
                    <td className="td text-right">{c._count.invoices}</td>
                    <td className="td text-right">
                      <Link href={`/companies/${c.id}/edit`} className="text-xs font-medium text-brand-600 hover:underline">
                        Düzenle
                      </Link>
                    </td>
                  </tr>
                ))}
                {companies.length === 0 && (
                  <tr>
                    <td className="td text-slate-400" colSpan={6}>Henüz şirket yok.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card h-fit p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Yeni şirket</h2>
          <ActionForm action={createCompanyAction} submitLabel="Şirket oluştur">
            <CompanyFields />
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
