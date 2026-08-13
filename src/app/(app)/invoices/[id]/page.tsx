import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/context";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui";
import { fmtDate, fmtMoney } from "@/lib/format";
import { InvoiceActions } from "./invoice-actions";

const STATUS_TR: Record<string, { label: string; color: "gray" | "blue" | "green" | "amber" | "red" | "purple" }> = {
  DRAFT: { label: "Taslak", color: "gray" },
  ISSUED: { label: "Kesildi", color: "blue" },
  SENT: { label: "Gönderildi", color: "purple" },
  ACCEPTED: { label: "Kabul edildi", color: "green" },
  REJECTED: { label: "Reddedildi", color: "red" },
  CANCELLED: { label: "İptal edildi", color: "red" },
};

const PROFILE_TR: Record<string, string> = { NONE: "Normal fatura", EARSIV: "e-Arşiv Fatura", EFATURA: "e-Fatura" };

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireAuth();

  const invoice = await ctx.db.invoice.findFirst({
    where: { id },
    include: {
      company: true,
      contact: true,
      lines: { include: { product: { select: { name: true } }, tax: { select: { name: true } } } },
    },
  });
  if (!invoice) notFound();

  const status = STATUS_TR[invoice.status] ?? { label: invoice.status, color: "gray" as const };

  return (
    <div>
      <PageHeader
        title={`${invoice.type === "SALES" ? "Satış" : "Alış"} Faturası · ${invoice.invoiceNumber}`}
        description={`${invoice.company.name}`}
        actions={<Link href="/invoices" className="btn-secondary">Listeye dön</Link>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Badge color={status.color}>{status.label}</Badge>
              <Badge color={invoice.einvoiceProfile === "NONE" ? "gray" : "purple"}>
                {PROFILE_TR[invoice.einvoiceProfile]}
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Satıcı</p>
                <p className="mt-1 font-medium text-slate-900">
                  {invoice.type === "SALES" ? invoice.company.name : invoice.contact.name}
                </p>
                <p className="text-sm text-slate-500">
                  VKN: {(invoice.type === "SALES" ? invoice.company.taxNumber : invoice.contact.taxNumber) ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Alıcı</p>
                <p className="mt-1 font-medium text-slate-900">
                  {invoice.type === "SALES" ? invoice.contact.name : invoice.company.name}
                </p>
                <p className="text-sm text-slate-500">
                  VKN: {(invoice.type === "SALES" ? invoice.contact.taxNumber : invoice.company.taxNumber) ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Düzenleme tarihi</p>
                <p className="mt-1 text-slate-700">{fmtDate(invoice.issueDate)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">ETTN</p>
                <p className="mt-1 break-all font-mono text-xs text-slate-600">{invoice.ettn ?? "-"}</p>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="th">Açıklama</th>
                  <th className="th text-right">Miktar</th>
                  <th className="th text-right">Birim Fiyat</th>
                  <th className="th text-right">KDV %</th>
                  <th className="th text-right">Net</th>
                  <th className="th text-right">KDV</th>
                  <th className="th text-right">Toplam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="td">{l.description || l.product?.name || "Kalem"}</td>
                    <td className="td text-right">{Number(l.quantity)}</td>
                    <td className="td text-right">{fmtMoney(Number(l.unitPrice))}</td>
                    <td className="td text-right">%{Number(l.taxRate)}</td>
                    <td className="td text-right">{fmtMoney(Number(l.netAmount))}</td>
                    <td className="td text-right">{fmtMoney(Number(l.taxAmount))}</td>
                    <td className="td text-right font-medium">{fmtMoney(Number(l.lineTotal))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td className="td" colSpan={5}></td>
                  <td className="td text-right text-slate-500">Ara toplam</td>
                  <td className="td text-right">{fmtMoney(Number(invoice.netTotal))}</td>
                </tr>
                <tr>
                  <td className="td" colSpan={5}></td>
                  <td className="td text-right text-slate-500">KDV</td>
                  <td className="td text-right">{fmtMoney(Number(invoice.taxTotal))}</td>
                </tr>
                <tr className="bg-slate-50 text-base font-semibold">
                  <td className="td" colSpan={5}></td>
                  <td className="td text-right">Genel toplam</td>
                  <td className="td text-right">{fmtMoney(Number(invoice.grandTotal))}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {invoice.note ? (
            <div className="card p-4 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Not: </span>
              {invoice.note}
            </div>
          ) : null}
        </div>

        <div className="card h-fit p-5">
          <h2 className="mb-4 font-semibold text-slate-800">İşlemler</h2>
          <InvoiceActions
            invoiceId={invoice.id}
            status={invoice.status}
            einvoiceProfile={invoice.einvoiceProfile}
          />
        </div>
      </div>
    </div>
  );
}
