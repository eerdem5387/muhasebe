import Link from "next/link";
import { requireAuth } from "@/lib/context";
import { PageHeader, EmptyState } from "@/components/page-header";
import { ManualEntryForm } from "./manual-entry-form";

export default async function NewManualEntryPage() {
  const ctx = await requireAuth();

  if (!ctx.companyId) {
    return (
      <div>
        <PageHeader title="Manuel Yevmiye Fişi" />
        <EmptyState message="Fiş girmek için önce bir şirket seçin." />
      </div>
    );
  }

  const [accounts, contacts] = await Promise.all([
    ctx.db.account.findMany({ where: { companyId: ctx.companyId }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
    ctx.db.contact.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Manuel Yevmiye Fişi"
        description={`${ctx.company?.name} · Serbest çift taraflı kayıt. Borç = Alacak olmalı.`}
        actions={<Link href="/journal" className="btn-secondary">Vazgeç</Link>}
      />
      <ManualEntryForm accounts={accounts} contacts={contacts} />
    </div>
  );
}
