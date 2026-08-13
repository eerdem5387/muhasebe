import { requireAuth } from "@/lib/context";
import { getContactStatement } from "@/server/accounting/reports";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Badge } from "@/components/ui";
import { ExportButton } from "@/components/export-button";
import { fmtDate, fmtMoney } from "@/lib/format";

export default async function StatementPage({
  searchParams,
}: {
  searchParams: Promise<{ contactId?: string }>;
}) {
  const ctx = await requireAuth();
  const { contactId } = await searchParams;

  if (!ctx.companyId) {
    return (
      <div>
        <PageHeader title="Cari Ekstre" />
        <EmptyState message="Cari ekstre için önce bir şirket seçin." />
      </div>
    );
  }

  const contacts = await ctx.db.contact.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  const selected = contactId && contacts.some((c) => c.id === contactId) ? contactId : "";
  const selectedContact = contacts.find((c) => c.id === selected);

  const statement = selected
    ? await getContactStatement(ctx.db, ctx.companyId, selected)
    : null;

  return (
    <div>
      <PageHeader
        title="Cari Ekstre"
        description={`${ctx.company?.name} · Seçili carinin borç/alacak hareketleri ve kümülatif bakiyesi.`}
        actions={selected ? <ExportButton resource="statement" query={{ contactId: selected }} /> : undefined}
      />

      <form method="get" className="card mb-6 flex flex-wrap items-end gap-4 p-5">
        <div className="min-w-[16rem]">
          <label className="label" htmlFor="contactId">Cari seçin</label>
          <select id="contactId" name="contactId" defaultValue={selected} className="input">
            <option value="">Seçin…</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-primary">Getir</button>
      </form>

      {!selected ? (
        <EmptyState message="Ekstreyi görmek için bir cari seçin." />
      ) : !statement || statement.rows.length === 0 ? (
        <EmptyState message={`${selectedContact?.name ?? "Cari"} için bu şirkette hareket bulunamadı.`} />
      ) : (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-800">{selectedContact?.name}</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Kapanış bakiyesi:</span>
              <Badge color={Number(statement.closingBalance) >= 0 ? "green" : "red"}>
                {fmtMoney(statement.closingBalance)} {Number(statement.closingBalance) >= 0 ? "(Borç)" : "(Alacak)"}
              </Badge>
            </div>
          </div>
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="th">Tarih</th>
                <th className="th">Açıklama</th>
                <th className="th">Hesap</th>
                <th className="th text-right">Borç</th>
                <th className="th text-right">Alacak</th>
                <th className="th text-right">Bakiye</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {statement.rows.map((r) => (
                <tr key={r.lineId}>
                  <td className="td">{fmtDate(r.date)}</td>
                  <td className="td">
                    {r.description ?? "-"}
                    <span className="ml-2 text-xs text-slate-400">{r.documentType}</span>
                  </td>
                  <td className="td"><span className="font-mono text-slate-500">{r.accountCode}</span> {r.accountName}</td>
                  <td className="td text-right">{Number(r.debit) ? fmtMoney(r.debit) : "-"}</td>
                  <td className="td text-right">{Number(r.credit) ? fmtMoney(r.credit) : "-"}</td>
                  <td className="td text-right font-medium">{fmtMoney(r.balance)}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <td className="td" colSpan={3}>Toplam</td>
                <td className="td text-right">{fmtMoney(statement.totalDebit)}</td>
                <td className="td text-right">{fmtMoney(statement.totalCredit)}</td>
                <td className="td text-right">{fmtMoney(statement.closingBalance)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
