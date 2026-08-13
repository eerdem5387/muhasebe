import { requireAuth } from "@/lib/context";
import { recordExpenseAction, recordIncomeAction } from "@/app/actions/vouchers";
import { PageHeader, EmptyState } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { Badge } from "@/components/ui";
import { fmtDate, fmtMoney, todayISO } from "@/lib/format";

export default async function ExpensesPage() {
  const ctx = await requireAuth();

  if (!ctx.companyId) {
    return (
      <div>
        <PageHeader title="Gelir / Gider Fişleri" />
        <EmptyState message="Fiş girmek için önce bir şirket seçin." />
      </div>
    );
  }

  const [expenseAccounts, incomeAccounts, contacts, recent] = await Promise.all([
    ctx.db.account.findMany({ where: { companyId: ctx.companyId, type: "EXPENSE" }, orderBy: { code: "asc" } }),
    ctx.db.account.findMany({ where: { companyId: ctx.companyId, type: "REVENUE" }, orderBy: { code: "asc" } }),
    ctx.db.contact.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ctx.db.ledgerEntry.findMany({
      where: { companyId: ctx.companyId, documentType: { in: ["EXPENSE", "INCOME"] } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 20,
      include: { lines: true },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Gelir / Gider Fişleri" description={`${ctx.company?.name} · Kasa/banka/veresiye gelir ve gider kayıtları.`} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Gider fişi</h2>
          <ActionForm action={recordExpenseAction} submitLabel="Gideri kaydet">
            <div>
              <label className="label" htmlFor="expenseAccountId">Gider hesabı</label>
              <select id="expenseAccountId" name="expenseAccountId" className="input" required>
                <option value="">Seçin…</option>
                {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="e-net">Net tutar</label>
                <input id="e-net" name="netAmount" className="input" inputMode="decimal" required />
              </div>
              <div>
                <label className="label" htmlFor="e-rate">KDV %</label>
                <input id="e-rate" name="taxRate" className="input" inputMode="decimal" defaultValue="20" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="e-via">Ödeme</label>
                <select id="e-via" name="via" className="input" defaultValue="CASH">
                  <option value="CASH">Kasa</option>
                  <option value="BANK">Banka</option>
                  <option value="ON_ACCOUNT">Veresiye (Satıcı)</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="e-date">Tarih</label>
                <input id="e-date" name="date" type="date" className="input" defaultValue={todayISO()} required />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="e-contact">Cari (veresiye ise)</label>
              <select id="e-contact" name="contactId" className="input">
                <option value="">-</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="e-desc">Açıklama</label>
              <input id="e-desc" name="description" className="input" />
            </div>
          </ActionForm>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Gelir fişi</h2>
          {incomeAccounts.length === 0 ? (
            <p className="text-sm text-slate-500">Gelir (REVENUE) hesabı bulunamadı. Hesap planından ekleyin (örn. 649).</p>
          ) : (
            <ActionForm action={recordIncomeAction} submitLabel="Geliri kaydet">
              <div>
                <label className="label" htmlFor="incomeAccountId">Gelir hesabı</label>
                <select id="incomeAccountId" name="incomeAccountId" className="input" required>
                  <option value="">Seçin…</option>
                  {incomeAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="i-net">Net tutar</label>
                  <input id="i-net" name="netAmount" className="input" inputMode="decimal" required />
                </div>
                <div>
                  <label className="label" htmlFor="i-rate">KDV %</label>
                  <input id="i-rate" name="taxRate" className="input" inputMode="decimal" defaultValue="20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="i-via">Tahsilat</label>
                  <select id="i-via" name="via" className="input" defaultValue="CASH">
                    <option value="CASH">Kasa</option>
                    <option value="BANK">Banka</option>
                    <option value="ON_ACCOUNT">Veresiye (Alıcı)</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="i-date">Tarih</label>
                  <input id="i-date" name="date" type="date" className="input" defaultValue={todayISO()} required />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="i-contact">Cari (veresiye ise)</label>
                <select id="i-contact" name="contactId" className="input">
                  <option value="">-</option>
                  {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="i-desc">Açıklama</label>
                <input id="i-desc" name="description" className="input" />
              </div>
            </ActionForm>
          )}
        </div>
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-800">Son gelir/gider fişleri</h2></div>
        <table className="w-full">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              <th className="th">Tarih</th>
              <th className="th">Tür</th>
              <th className="th">Açıklama</th>
              <th className="th text-right">Tutar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recent.map((e) => {
              const total = e.lines.reduce((s, l) => s + Number(l.debit), 0);
              return (
                <tr key={e.id}>
                  <td className="td">{fmtDate(e.date)}</td>
                  <td className="td">
                    <Badge color={e.documentType === "INCOME" ? "green" : "amber"}>
                      {e.documentType === "INCOME" ? "Gelir" : "Gider"}
                    </Badge>
                  </td>
                  <td className="td">{e.description ?? "-"}</td>
                  <td className="td text-right font-medium">{fmtMoney(total)}</td>
                </tr>
              );
            })}
            {recent.length === 0 && <tr><td className="td text-slate-400" colSpan={4}>Henüz kayıt yok.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
