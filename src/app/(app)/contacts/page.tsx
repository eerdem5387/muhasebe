import Link from "next/link";
import type { ContactType, CrmStage } from "@prisma/client";
import { requireAuth } from "@/lib/context";
import { createContactAction, deleteContactAction, updateContactStageAction } from "@/app/actions/crm";
import { recordPaymentAction } from "@/app/actions/accounting";
import { PageHeader } from "@/components/page-header";
import { ActionForm, MiniForm } from "@/components/action-form";
import { Badge } from "@/components/ui";
import { ExportButton } from "@/components/export-button";
import { ContactFields } from "./contact-fields";
import { todayISO } from "@/lib/format";

const TYPE_LABEL: Record<ContactType, { label: string; color: "green" | "amber" | "purple" }> = {
  CUSTOMER: { label: "Müşteri", color: "green" },
  VENDOR: { label: "Tedarikçi", color: "amber" },
  LEAD: { label: "Aday", color: "purple" },
};

const STAGES: CrmStage[] = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"];
const STAGE_LABEL: Record<CrmStage, string> = {
  NEW: "Yeni",
  CONTACTED: "İletişim",
  QUALIFIED: "Nitelikli",
  PROPOSAL: "Teklif",
  WON: "Kazanıldı",
  LOST: "Kaybedildi",
};

export default async function ContactsPage() {
  const ctx = await requireAuth();
  const contacts = await ctx.db.contact.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader
        title="Cariler / CRM"
        description="Cariler tenant genelinde ortaktır (şirketlere özel değildir). CRM aşaması ile satış hunisini takip edin."
        actions={<ExportButton resource="contacts" />}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="th">Cari</th>
                  <th className="th">Tür</th>
                  <th className="th">CRM Aşama</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td className="td">
                      <Link href={`/contacts/${c.id}`} className="font-medium text-brand-700 hover:underline">
                        {c.name}
                      </Link>
                      <div className="text-xs text-slate-400">{c.email ?? "-"}</div>
                    </td>
                    <td className="td">
                      <Badge color={TYPE_LABEL[c.type].color}>{TYPE_LABEL[c.type].label}</Badge>
                    </td>
                    <td className="td">
                      <MiniForm action={updateContactStageAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <select
                          name="crmStage"
                          defaultValue={c.crmStage}
                          className="input !w-auto !py-1 text-xs"
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>{STAGE_LABEL[s]}</option>
                          ))}
                        </select>
                        <button type="submit" className="ml-2 text-xs font-medium text-brand-600 hover:underline">
                          Kaydet
                        </button>
                      </MiniForm>
                    </td>
                    <td className="td text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/contacts/${c.id}/edit`}
                          className="text-xs font-medium text-slate-600 hover:underline"
                        >
                          Düzenle
                        </Link>
                        <Link
                          href={`/reports/statement?contactId=${c.id}`}
                          className="text-xs font-medium text-brand-600 hover:underline"
                        >
                          Ekstre
                        </Link>
                        <MiniForm action={deleteContactAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                            Sil
                          </button>
                        </MiniForm>
                      </div>
                    </td>
                  </tr>
                ))}
                {contacts.length === 0 && (
                  <tr><td className="td text-slate-400" colSpan={4}>Henüz cari yok.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-4 font-semibold text-slate-800">Yeni cari</h2>
            <ActionForm action={createContactAction} submitLabel="Cari ekle">
              <ContactFields />
            </ActionForm>
          </div>

          <div className="card p-5">
            <h2 className="mb-1 font-semibold text-slate-800">Tahsilat / Ödeme</h2>
            <p className="mb-4 text-xs text-slate-400">
              Aktif şirket: {ctx.company?.name ?? "seçili değil"}. Kasa/banka ile cari hesabı arasında fiş oluşturur.
            </p>
            <ActionForm action={recordPaymentAction} submitLabel="Kaydet">
              <div>
                <label className="label" htmlFor="pay-contact">Cari</label>
                <select id="pay-contact" name="contactId" className="input" required>
                  <option value="">Seçin…</option>
                  {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="direction">İşlem</label>
                  <select id="direction" name="direction" className="input" defaultValue="COLLECTION">
                    <option value="COLLECTION">Tahsilat</option>
                    <option value="PAYMENT">Ödeme</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="via">Kanal</label>
                  <select id="via" name="via" className="input" defaultValue="BANK">
                    <option value="BANK">Banka</option>
                    <option value="CASH">Kasa</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="amount">Tutar</label>
                  <input id="amount" name="amount" className="input" inputMode="decimal" required />
                </div>
                <div>
                  <label className="label" htmlFor="pay-date">Tarih</label>
                  <input id="pay-date" name="date" type="date" className="input" defaultValue={todayISO()} required />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="pay-desc">Açıklama</label>
                <input id="pay-desc" name="description" className="input" />
              </div>
            </ActionForm>
          </div>
        </div>
      </div>
    </div>
  );
}
