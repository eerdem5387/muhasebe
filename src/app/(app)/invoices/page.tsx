import Link from "next/link";
import { requireAuth } from "@/lib/context";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Badge } from "@/components/ui";
import { ExportButton } from "@/components/export-button";
import { fmtDate, fmtMoney } from "@/lib/format";

const STATUS_TR: Record<string, { label: string; color: "gray" | "blue" | "green" | "amber" | "red" | "purple" }> = {
  DRAFT: { label: "Taslak", color: "gray" },
  ISSUED: { label: "Kesildi", color: "blue" },
  SENT: { label: "Gönderildi", color: "purple" },
  ACCEPTED: { label: "Kabul", color: "green" },
  REJECTED: { label: "Ret", color: "red" },
  CANCELLED: { label: "İptal", color: "red" },
};

export default async function InvoicesPage() {
  const ctx = await requireAuth();

  if (!ctx.companyId) {
    return (
      <div>
        <PageHeader title="Faturalar" />
        <EmptyState message="Fatura kesmek için önce bir şirket oluşturun ve seçin." />
      </div>
    );
  }

  const invoices = await ctx.db.invoice.findMany({
    where: { companyId: ctx.companyId },
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    include: { contact: { select: { name: true } }, _count: { select: { lines: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Faturalar"
        description={`${ctx.company?.name} · Satış ve alış faturaları otomatik olarak yevmiyeye işlenir.`}
        actions={
          <>
            <ExportButton resource="invoices" />
            <Link href="/invoices/new" className="btn-primary">Yeni fatura</Link>
          </>
        }
      />

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Tür</th>
              <th className="th">Durum</th>
              <th className="th">Fatura No</th>
              <th className="th">Cari</th>
              <th className="th">Tarih</th>
              <th className="th text-right">Genel Toplam</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td className="td">
                  <Badge color={inv.type === "SALES" ? "green" : "amber"}>
                    {inv.type === "SALES" ? "Satış" : "Alış"}
                  </Badge>
                </td>
                <td className="td">
                  <Badge color={STATUS_TR[inv.status]?.color ?? "gray"}>
                    {STATUS_TR[inv.status]?.label ?? inv.status}
                  </Badge>
                </td>
                <td className="td font-medium text-slate-900">{inv.invoiceNumber}</td>
                <td className="td">{inv.contact.name}</td>
                <td className="td">{fmtDate(inv.issueDate)}</td>
                <td className="td text-right font-semibold">{fmtMoney(Number(inv.grandTotal))}</td>
                <td className="td text-right">
                  <Link href={`/invoices/${inv.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                    Detay
                  </Link>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td className="td text-slate-400" colSpan={7}>Henüz fatura yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
