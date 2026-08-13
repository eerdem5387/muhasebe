import Link from "next/link";
import { requireAuth } from "@/lib/context";
import { PageHeader, EmptyState } from "@/components/page-header";
import { InvoiceForm } from "./invoice-form";

export default async function NewInvoicePage() {
  const ctx = await requireAuth();

  if (!ctx.companyId) {
    return (
      <div>
        <PageHeader title="Yeni Fatura" />
        <EmptyState message="Fatura kesmek için önce bir şirket oluşturun ve seçin." />
      </div>
    );
  }

  const [contacts, products, taxes] = await Promise.all([
    ctx.db.contact.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, taxNumber: true, tckn: true, taxOffice: true,
        address: true, neighborhood: true, district: true, city: true, phone: true, email: true,
      },
    }),
    ctx.db.product.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, defaultPrice: true, unit: true } }),
    ctx.db.tax.findMany({ orderBy: { rate: "desc" }, select: { id: true, name: true, rate: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Yeni Fatura"
        description={`${ctx.company?.name} için satış/alış faturası`}
        actions={<Link href="/invoices" className="btn-secondary">Vazgeç</Link>}
      />
      <InvoiceForm
        contacts={contacts.map((c) => ({
          id: c.id, name: c.name, taxNumber: c.taxNumber, tckn: c.tckn, taxOffice: c.taxOffice,
          address: c.address, neighborhood: c.neighborhood, district: c.district, city: c.city,
          phone: c.phone, email: c.email,
        }))}
        products={products.map((p) => ({ id: p.id, name: p.name, defaultPrice: String(p.defaultPrice), unit: p.unit }))}
        taxes={taxes.map((t) => ({ id: t.id, name: t.name, rate: Number(t.rate) }))}
      />
    </div>
  );
}
