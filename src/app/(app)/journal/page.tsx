import Link from "next/link";
import { requireAuth } from "@/lib/context";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Badge } from "@/components/ui";
import { ExportButton } from "@/components/export-button";
import { ReverseEntryButton } from "./reverse-button";
import { fmtDate, fmtMoney } from "@/lib/format";

export default async function JournalPage() {
  const ctx = await requireAuth();

  if (!ctx.companyId) {
    return (
      <div>
        <PageHeader title="Yevmiye (T-Cetveli)" />
        <EmptyState message="Yevmiye fişlerini görmek için önce bir şirket seçin." />
      </div>
    );
  }

  const entries = await ctx.db.ledgerEntry.findMany({
    where: { companyId: ctx.companyId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      lines: {
        include: {
          account: { select: { code: true, name: true } },
          contact: { select: { name: true } },
        },
      },
      reversedBy: { select: { id: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Yevmiye (T-Cetveli)"
        description={`${ctx.company?.name} · Çift taraflı kayıt fişleri. Her fişte borç = alacak.`}
        actions={
          <>
            <ExportButton resource="journal" />
            <Link href="/journal/new" className="btn-primary">Manuel fiş</Link>
          </>
        }
      />

      {entries.length === 0 ? (
        <EmptyState message="Henüz yevmiye fişi yok. Fatura veya transfer oluşturunca otomatik oluşur." />
      ) : (
        <div className="space-y-4">
          {entries.map((e) => {
            const debit = e.lines.reduce((s, l) => s + Number(l.debit), 0);
            const credit = e.lines.reduce((s, l) => s + Number(l.credit), 0);
            const balanced = debit.toFixed(2) === credit.toFixed(2);
            return (
              <div key={e.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">{fmtDate(e.date)}</span>
                    <Badge color="blue">{e.documentType}</Badge>
                    <span className="text-sm text-slate-600">{e.description ?? "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.reversalOfId ? <Badge color="amber">Storno</Badge> : null}
                    {e.reversedBy ? <Badge color="red">İptal edildi</Badge> : null}
                    <Badge color={balanced ? "green" : "red"}>
                      {balanced ? "Dengeli" : "DENGESİZ"}
                    </Badge>
                    {!e.reversedBy && !e.reversalOfId ? <ReverseEntryButton entryId={e.id} /> : null}
                  </div>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="th">Hesap</th>
                      <th className="th">Cari</th>
                      <th className="th text-right">Borç</th>
                      <th className="th text-right">Alacak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {e.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="td">
                          <span className="font-mono text-slate-500">{l.account.code}</span> {l.account.name}
                        </td>
                        <td className="td text-slate-500">{l.contact?.name ?? "-"}</td>
                        <td className="td text-right">{Number(l.debit) ? fmtMoney(Number(l.debit)) : "-"}</td>
                        <td className="td text-right">{Number(l.credit) ? fmtMoney(Number(l.credit)) : "-"}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td className="td" colSpan={2}>Toplam</td>
                      <td className="td text-right">{fmtMoney(debit)}</td>
                      <td className="td text-right">{fmtMoney(credit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
