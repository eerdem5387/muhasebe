import { requireAuth } from "@/lib/context";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui";
import { STATUS_TR, fmtMoney, fmtMonth, toYearMonth } from "@/lib/format";
import { scheduleStatus } from "@/server/income-schedule";

const statusColor = { BLOCKED: "amber", EXPECTED: "blue", REALIZED: "green" } as const;

export default async function IncomePage() {
  const ctx = await requireAuth();
  const lines = await ctx.db.incomeScheduleLine.findMany({
    where: { enrollment: { status: "ACTIVE" } },
    include: {
      enrollment: {
        include: {
          student: { select: { fullName: true } },
          collections: { select: { id: true } },
        },
      },
    },
    orderBy: [{ yearMonth: "asc" }, { installmentIndex: "asc" }],
  });

  const grouped = new Map<string, typeof lines>();
  for (const line of lines) {
    const live = scheduleStatus(line.releaseDate, line.enrollment.collections.length > 0);
    const row = { ...line, status: live };
    const list = grouped.get(line.yearMonth) ?? [];
    list.push(row);
    grouped.set(line.yearMonth, list);
  }

  const currentYm = toYearMonth(new Date());

  return (
    <div>
      <PageHeader title="Gelir planı" description="Bloke süresi ve taksitlere göre aya yayılmış kayıt ücretleri." />
      <div className="space-y-6">
        {[...grouped.entries()].map(([ym, rows]) => {
          const blocked = rows.filter((r) => r.status === "BLOCKED").reduce((s, r) => s + Number(r.amount), 0);
          const expected = rows.filter((r) => r.status === "EXPECTED").reduce((s, r) => s + Number(r.amount), 0);
          const realized = rows.filter((r) => r.status === "REALIZED").reduce((s, r) => s + Number(r.amount), 0);
          return (
            <div key={ym} className={`card overflow-hidden ${ym === currentYm ? "ring-2 ring-brand-200" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h2 className="font-semibold text-slate-800">{fmtMonth(ym)}</h2>
                <div className="flex gap-4 text-sm">
                  <span>Blokeli {fmtMoney(blocked)}</span>
                  <span>Beklenen {fmtMoney(expected)}</span>
                  <span className="font-medium">Gerçekleşen {fmtMoney(realized)}</span>
                </div>
              </div>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Öğrenci</th>
                    <th className="th">Taksit</th>
                    <th className="th text-right">Tutar</th>
                    <th className="th">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="td">{r.enrollment.student.fullName}</td>
                      <td className="td">{r.installmentIndex}/{r.enrollment.installmentCount}</td>
                      <td className="td text-right">{fmtMoney(Number(r.amount))}</td>
                      <td className="td"><Badge color={statusColor[r.status]}>{STATUS_TR[r.status]}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        {grouped.size === 0 && <p className="text-sm text-slate-500">Henüz gelir planı yok.</p>}
      </div>
    </div>
  );
}
