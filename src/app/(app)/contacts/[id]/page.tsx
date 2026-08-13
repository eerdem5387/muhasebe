import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/context";
import { addActivityAction, toggleActivityAction, updateContactStageAction } from "@/app/actions/crm";
import { PageHeader } from "@/components/page-header";
import { ActionForm, MiniForm } from "@/components/action-form";
import { Badge } from "@/components/ui";
import { fmtDate, fmtMoney, todayISO } from "@/lib/format";

const TYPE_TR: Record<string, string> = { CUSTOMER: "Müşteri", VENDOR: "Tedarikçi", LEAD: "Aday" };
const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"] as const;
const STAGE_TR: Record<string, string> = { NEW: "Yeni", CONTACTED: "İletişimde", QUALIFIED: "Nitelikli", PROPOSAL: "Teklif", WON: "Kazanıldı", LOST: "Kayıp" };
const ACT_TR: Record<string, string> = { NOTE: "Not", CALL: "Arama", MEETING: "Toplantı", EMAIL: "E-posta", TASK: "Görev" };

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireAuth();

  const contact = await ctx.db.contact.findFirst({
    where: { id },
    include: {
      activities: { orderBy: [{ done: "asc" }, { createdAt: "desc" }] },
      invoices: { orderBy: { issueDate: "desc" }, take: 10, include: { company: { select: { name: true } } } },
    },
  });
  if (!contact) notFound();

  // Cari bakiye (aktif şirket bazında)
  let balance = 0;
  if (ctx.companyId) {
    const agg = await ctx.db.ledgerLine.aggregate({
      where: { contactId: id, ledgerEntry: { companyId: ctx.companyId } },
      _sum: { debit: true, credit: true },
    });
    balance = Number(agg._sum.debit ?? 0) - Number(agg._sum.credit ?? 0);
  }

  return (
    <div>
      <PageHeader
        title={contact.name}
        description={`${TYPE_TR[contact.type]} · ${STAGE_TR[contact.crmStage]}`}
        actions={
          <>
            <Link href={`/contacts/${contact.id}/edit`} className="btn-secondary">Düzenle</Link>
            {ctx.companyId ? (
              <Link href={`/reports/statement?contactId=${contact.id}`} className="btn-secondary">Cari ekstre</Link>
            ) : null}
            <Link href="/contacts" className="btn-secondary">Listeye dön</Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-slate-800">Bilgiler</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">E-posta</dt><dd>{contact.email ?? "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Telefon</dt><dd>{contact.phone ?? "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">VKN/TCKN</dt><dd>{contact.taxNumber ?? "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Vergi dairesi</dt><dd>{contact.taxOffice ?? "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Şehir</dt><dd>{contact.city ?? "-"}</dd></div>
            </dl>
            {ctx.companyId ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">Güncel bakiye ({ctx.company?.name})</p>
                <p className={`text-xl font-bold ${balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtMoney(balance)}</p>
                <p className="text-xs text-slate-400">{balance >= 0 ? "(Borçlu / bizden alacaklı)" : "(Alacaklı)"}</p>
              </div>
            ) : null}
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-slate-800">CRM Aşaması</h2>
            <MiniForm action={updateContactStageAction}>
              <input type="hidden" name="id" value={contact.id} />
              <select name="crmStage" defaultValue={contact.crmStage} className="input mb-2">
                {STAGES.map((s) => <option key={s} value={s}>{STAGE_TR[s]}</option>)}
              </select>
              <button type="submit" className="btn-secondary w-full">Aşamayı güncelle</button>
            </MiniForm>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-slate-800">Aktivite ekle</h2>
            <ActionForm action={addActivityAction} submitLabel="Ekle">
              <input type="hidden" name="contactId" value={contact.id} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <select name="type" className="input" defaultValue="NOTE">
                  {Object.entries(ACT_TR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input name="subject" className="input sm:col-span-2" placeholder="Konu" required />
              </div>
              <input name="notes" className="input" placeholder="Detay (opsiyonel)" />
              <div>
                <label className="label" htmlFor="dueDate">Hatırlatma tarihi (ops.)</label>
                <input id="dueDate" name="dueDate" type="date" className="input" />
              </div>
            </ActionForm>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-slate-800">Aktivite geçmişi</h2>
            {contact.activities.length === 0 ? (
              <p className="text-sm text-slate-400">Henüz aktivite yok.</p>
            ) : (
              <ul className="space-y-3">
                {contact.activities.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 border-l-2 border-brand-200 pl-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge color="blue">{ACT_TR[a.type]}</Badge>
                        <span className={`font-medium ${a.done ? "text-slate-400 line-through" : "text-slate-800"}`}>{a.subject}</span>
                      </div>
                      {a.notes ? <p className="mt-1 text-sm text-slate-500">{a.notes}</p> : null}
                      <p className="mt-1 text-xs text-slate-400">
                        {fmtDate(a.createdAt)}{a.dueDate ? ` · Hatırlatma: ${fmtDate(a.dueDate)}` : ""}
                      </p>
                    </div>
                    <MiniForm action={toggleActivityAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="contactId" value={contact.id} />
                      <input type="hidden" name="done" value={String(a.done)} />
                      <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                        {a.done ? "Geri al" : "Tamamlandı"}
                      </button>
                    </MiniForm>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-800">Son faturalar</h2></div>
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="th">Tarih</th>
                  <th className="th">No</th>
                  <th className="th">Şirket</th>
                  <th className="th text-right">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contact.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="td">{fmtDate(inv.issueDate)}</td>
                    <td className="td"><Link href={`/invoices/${inv.id}`} className="text-brand-600 hover:underline">{inv.invoiceNumber}</Link></td>
                    <td className="td text-slate-500">{inv.company.name}</td>
                    <td className="td text-right font-medium">{fmtMoney(Number(inv.grandTotal))}</td>
                  </tr>
                ))}
                {contact.invoices.length === 0 && <tr><td className="td text-slate-400" colSpan={4}>Fatura yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
