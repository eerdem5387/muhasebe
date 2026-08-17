import { requireAuth, canManageOperations } from "@/lib/context";
import { createExpenseAction } from "@/app/actions/expenses";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { FormModal } from "@/components/form-modal";
import { CHANNEL_TR, fmtDate, fmtMoney, todayISO } from "@/lib/format";

export default async function ExpensesPage() {
  const ctx = await requireAuth();
  const canWrite = canManageOperations(ctx.role, ctx.isSuperAdmin);
  const [expenses, categories, approvedRequests] = await Promise.all([
    ctx.db.expense.findMany({
      orderBy: { spentAt: "desc" },
      include: {
        category: true,
        attachments: { select: { id: true, filename: true } },
        request: { select: { title: true } },
      },
    }),
    ctx.db.ledgerCategory.findMany({ where: { type: "EXPENSE" }, orderBy: { name: "asc" } }),
    ctx.db.expenseRequest.findMany({ where: { status: "APPROVED" }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Giderler"
        description="Kalem seçin, tutarı ve makbuzu ekleyin."
        actions={
          canWrite ? (
            <FormModal buttonLabel="Gider ekle" title="Gider kaydet">
              <ActionForm action={createExpenseAction} submitLabel="Kaydet">
                <div>
                  <label className="label" htmlFor="categoryId">Gider kalemi</label>
                  <select id="categoryId" name="categoryId" className="input" required>
                    <option value="">Seçin…</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="amount">Tutar</label>
                  <input id="amount" name="amount" className="input" required />
                </div>
                <div>
                  <label className="label" htmlFor="spentAt">Tarih</label>
                  <input id="spentAt" name="spentAt" type="date" className="input" defaultValue={todayISO()} required />
                </div>
                <div>
                  <label className="label" htmlFor="channel">Kanal</label>
                  <select id="channel" name="channel" className="input">
                    <option value="">—</option>
                    <option value="CREDIT_CARD">{CHANNEL_TR.CREDIT_CARD}</option>
                    <option value="TRANSFER">{CHANNEL_TR.TRANSFER}</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="requestId">Onaylı talep (opsiyonel)</label>
                  <select id="requestId" name="requestId" className="input">
                    <option value="">—</option>
                    {approvedRequests.map((r) => (
                      <option key={r.id} value={r.id}>{r.title} · {fmtMoney(Number(r.total))}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="file">Makbuz / slip</label>
                  <input id="file" name="file" type="file" accept="image/*,.pdf" className="input" required />
                </div>
                <div>
                  <label className="label" htmlFor="notes">Not</label>
                  <input id="notes" name="notes" className="input" />
                </div>
              </ActionForm>
            </FormModal>
          ) : undefined
        }
      />
      <div className="overflow-hidden card">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Tarih</th>
              <th className="th">Kalem</th>
              <th className="th text-right">Tutar</th>
              <th className="th">Belge</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.map((e) => (
              <tr key={e.id}>
                <td className="td">{fmtDate(e.spentAt)}</td>
                <td className="td">
                  {e.category.name}
                  {e.request ? <span className="block text-xs text-slate-400">{e.request.title}</span> : null}
                </td>
                <td className="td text-right">{fmtMoney(Number(e.amount))}</td>
                <td className="td">
                  {e.attachments.map((a) => (
                    <a key={a.id} href={`/api/attachments/${a.id}`} className="text-brand-600 underline" target="_blank">{a.filename}</a>
                  ))}
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td className="td text-slate-400" colSpan={4}>Henüz gider yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
