import type { AccountType } from "@prisma/client";
import { requireAuth } from "@/lib/context";
import { createAccountAction } from "@/app/actions/company";
import { PageHeader, EmptyState } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { Badge } from "@/components/ui";
import { ExportButton } from "@/components/export-button";
import Link from "next/link";

const TYPE_LABEL: Record<AccountType, { label: string; color: "green" | "amber" | "blue" | "purple" | "gray" }> = {
  ASSET: { label: "Varlık", color: "green" },
  LIABILITY: { label: "Yükümlülük", color: "amber" },
  EQUITY: { label: "Özkaynak", color: "purple" },
  REVENUE: { label: "Gelir", color: "blue" },
  EXPENSE: { label: "Gider", color: "gray" },
};

export default async function AccountsPage() {
  const ctx = await requireAuth();

  if (!ctx.companyId) {
    return (
      <div>
        <PageHeader title="Hesap Planı" />
        <EmptyState message="Hesap planını görmek için önce bir şirket oluşturun ve seçin." />
      </div>
    );
  }

  const accounts = await ctx.db.account.findMany({
    where: { companyId: ctx.companyId },
    orderBy: { code: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Hesap Planı"
        description={`${ctx.company?.name} · Hesaplar şirket bazındadır (company_id).`}
        actions={<ExportButton resource="accounts" />}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="th">Kod</th>
                  <th className="th">Ad</th>
                  <th className="th">Tür</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td className="td font-mono font-medium text-slate-900">
                      <Link href={`/accounts/${a.id}`} className="text-brand-700 hover:underline">{a.code}</Link>
                    </td>
                    <td className="td">
                      <Link href={`/accounts/${a.id}`} className="hover:underline">{a.name}</Link>
                    </td>
                    <td className="td"><Badge color={TYPE_LABEL[a.type].color}>{TYPE_LABEL[a.type].label}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card h-fit p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Yeni hesap</h2>
          <ActionForm action={createAccountAction} submitLabel="Hesap ekle">
            <div>
              <label className="label" htmlFor="code">Kod</label>
              <input id="code" name="code" className="input font-mono" placeholder="101" required />
            </div>
            <div>
              <label className="label" htmlFor="name">Ad</label>
              <input id="name" name="name" className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="type">Tür</label>
              <select id="type" name="type" className="input" defaultValue="ASSET">
                <option value="ASSET">Varlık</option>
                <option value="LIABILITY">Yükümlülük</option>
                <option value="EQUITY">Özkaynak</option>
                <option value="REVENUE">Gelir</option>
                <option value="EXPENSE">Gider</option>
              </select>
            </div>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
