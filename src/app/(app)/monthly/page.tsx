import { requireAuth, canManageOperations } from "@/lib/context";
import { PageHeader } from "@/components/page-header";
import { MiniForm } from "@/components/action-form";
import { fmtDate, fmtMoney, fmtMonthUpper, toYearMonth } from "@/lib/format";
import { deleteReportEntryAction } from "@/app/actions/report";
import { MonthToolbar } from "./month-toolbar";
import { ReportEntryModal, ReportStructureModal } from "./entry-form";

function parseMonth(raw: string | undefined): string {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw;
  return toYearMonth(new Date());
}

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const ctx = await requireAuth();
  const canWrite = canManageOperations(ctx.role, ctx.isSuperAdmin);
  const month = parseMonth((await searchParams).month);

  const groups = await ctx.db.reportGroup.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          entries: {
            where: { yearMonth: month },
            orderBy: { occurredAt: "asc" },
          },
        },
      },
    },
  });

  const incomeGroups = groups.filter((g) => g.side === "INCOME");
  const expenseGroups = groups.filter((g) => g.side === "EXPENSE");

  const visibleIncome = incomeGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => it.entries.length > 0),
    }))
    .filter((g) => g.items.length > 0);

  const visibleExpense = expenseGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => it.entries.length > 0),
    }))
    .filter((g) => g.items.length > 0);

  const incomeTotal = visibleIncome.reduce(
    (sum, g) => sum + g.items.reduce((s, it) => s + it.entries.reduce((e, row) => e + Number(row.amount), 0), 0),
    0,
  );
  const expenseCash = visibleExpense.reduce(
    (sum, g) => sum + g.items.reduce((s, it) => s + it.entries.filter((e) => e.payKind === "CASH").reduce((n, row) => n + Number(row.amount), 0), 0),
    0,
  );
  const expenseCard = visibleExpense.reduce(
    (sum, g) => sum + g.items.reduce((s, it) => s + it.entries.filter((e) => e.payKind === "CARD").reduce((n, row) => n + Number(row.amount), 0), 0),
    0,
  );
  const expenseTotal = expenseCash + expenseCard;
  const net = incomeTotal - expenseTotal;

  const incomeOptions = incomeGroups.map((g) => ({
    id: g.id,
    name: g.name,
    items: g.items.map((it) => ({ id: it.id, name: it.name })),
  }));
  const expenseOptions = expenseGroups.map((g) => ({
    id: g.id,
    name: g.name,
    items: g.items.map((it) => ({ id: it.id, name: it.name })),
  }));

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title="Aylık gelir-gider"
          description="Ana kalem ve alt kalemleri siz oluşturursunuz. Bu ay tutar yazılmayan kalem raporda görünmez."
          actions={<MonthToolbar month={month} />}
        />
      </div>

      <div className="monthly-report overflow-hidden card">
        <div className="border-b border-slate-800 px-4 py-4 text-center">
          <p className="text-sm font-semibold tracking-wide text-slate-500">{ctx.tenantName}</p>
          <h2 className="mt-1 text-xl font-bold uppercase tracking-wide text-slate-900">
            {fmtMonthUpper(month)} tarihli gelir gider ödeme özet tablosu
          </h2>
        </div>

        <div className="grid grid-cols-1 divide-y divide-slate-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <section>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-900 px-4 py-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Gelirler</h3>
              {canWrite && (
                <div className="print:hidden flex items-center gap-2">
                  <ReportEntryModal side="INCOME" month={month} groups={incomeOptions} />
                  <ReportStructureModal side="INCOME" month={month} groups={incomeOptions} />
                </div>
              )}
            </div>
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="th">Açıklama</th>
                  <th className="th text-right">Tutar</th>
                  {canWrite && <th className="th print:hidden"></th>}
                </tr>
              </thead>
              <tbody>
                {visibleIncome.map((group) => {
                  const subtotal = group.items.reduce(
                    (s, it) => s + it.entries.reduce((n, e) => n + Number(e.amount), 0),
                    0,
                  );
                  return (
                    <GroupRows key={group.id} name={group.name} subtotal={subtotal} expense={false} extra={canWrite}>
                      {group.items.map((item) =>
                        item.entries.map((entry) => (
                          <tr key={entry.id} className="border-b border-slate-100">
                            <td className="px-4 py-2 pl-8 text-sm text-slate-700">{item.name}{entry.notes ? ` · ${entry.notes}` : ""}</td>
                            <td className="td text-right">{fmtMoney(Number(entry.amount))}</td>
                            {canWrite && (
                              <td className="td print:hidden text-right">
                                <MiniForm action={deleteReportEntryAction}>
                                  <input type="hidden" name="id" value={entry.id} />
                                  <input type="hidden" name="yearMonth" value={month} />
                                  <button className="text-xs text-red-600">Sil</button>
                                </MiniForm>
                              </td>
                            )}
                          </tr>
                        )),
                      )}
                    </GroupRows>
                  );
                })}
                {visibleIncome.length === 0 && (
                  <tr>
                    <td className="td text-slate-400" colSpan={canWrite ? 3 : 2}>Bu ay gelir yok.</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-800 bg-slate-50 font-semibold">
                  <td className="td">Toplam gelir</td>
                  <td className="td text-right">{fmtMoney(incomeTotal)}</td>
                  {canWrite && <td className="td print:hidden"></td>}
                </tr>
              </tfoot>
            </table>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-900 px-4 py-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Giderler</h3>
              {canWrite && (
                <div className="print:hidden flex items-center gap-2">
                  <ReportEntryModal side="EXPENSE" month={month} groups={expenseOptions} />
                  <ReportStructureModal side="EXPENSE" month={month} groups={expenseOptions} />
                </div>
              )}
            </div>
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="th">Açıklama</th>
                  <th className="th text-right">Nakit</th>
                  <th className="th text-right">KK harcama</th>
                  <th className="th">Tarih</th>
                  {canWrite && <th className="th print:hidden"></th>}
                </tr>
              </thead>
              <tbody>
                {visibleExpense.map((group) => {
                  const cash = group.items.reduce((s, it) => s + it.entries.filter((e) => e.payKind === "CASH").reduce((n, e) => n + Number(e.amount), 0), 0);
                  const card = group.items.reduce((s, it) => s + it.entries.filter((e) => e.payKind === "CARD").reduce((n, e) => n + Number(e.amount), 0), 0);
                  return (
                    <GroupRows key={group.id} name={group.name} subtotal={cash + card} expense cash={cash} card={card} extra={canWrite}>
                      {group.items.map((item) =>
                        item.entries.map((entry) => (
                          <tr key={entry.id} className="border-b border-slate-100">
                            <td className="px-4 py-2 pl-8 text-sm text-slate-700">{item.name}{entry.notes ? ` · ${entry.notes}` : ""}</td>
                            <td className="td text-right">{entry.payKind === "CASH" ? fmtMoney(Number(entry.amount)) : ""}</td>
                            <td className="td text-right">{entry.payKind === "CARD" ? fmtMoney(Number(entry.amount)) : ""}</td>
                            <td className="td text-slate-500">{fmtDate(entry.occurredAt)}</td>
                            {canWrite && (
                              <td className="td print:hidden text-right">
                                <MiniForm action={deleteReportEntryAction}>
                                  <input type="hidden" name="id" value={entry.id} />
                                  <input type="hidden" name="yearMonth" value={month} />
                                  <button className="text-xs text-red-600">Sil</button>
                                </MiniForm>
                              </td>
                            )}
                          </tr>
                        )),
                      )}
                    </GroupRows>
                  );
                })}
                {visibleExpense.length === 0 && (
                  <tr>
                    <td className="td text-slate-400" colSpan={canWrite ? 5 : 4}>Bu ay gider yok.</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-800 bg-slate-50 font-semibold">
                  <td className="td">Toplam gider</td>
                  <td className="td text-right">{fmtMoney(expenseCash)}</td>
                  <td className="td text-right">{fmtMoney(expenseCard)}</td>
                  <td className="td text-right" colSpan={canWrite ? 2 : 1}>{fmtMoney(expenseTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        </div>

        <div className={`border-t border-slate-200 px-4 py-3 text-right text-sm font-semibold ${net >= 0 ? "text-emerald-700" : "text-red-700"}`}>
          Net (gelir − gider): {fmtMoney(net)}
        </div>
      </div>
    </div>
  );
}

function GroupRows({
  name,
  subtotal,
  expense,
  cash,
  card,
  extra,
  children,
}: {
  name: string;
  subtotal: number;
  expense: boolean;
  cash?: number;
  card?: number;
  extra?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <tr className="border-b border-slate-200 bg-slate-50">
        <td className="px-4 py-2 text-sm font-semibold text-slate-900">{name}</td>
        {expense ? (
          <>
            <td className="td text-right text-xs text-slate-500">{cash ? fmtMoney(cash) : ""}</td>
            <td className="td text-right text-xs text-slate-500">{card ? fmtMoney(card) : ""}</td>
            <td className="td"></td>
            {extra ? <td className="td print:hidden"></td> : null}
          </>
        ) : (
          <>
            <td className="td text-right text-xs font-semibold text-slate-600">{fmtMoney(subtotal)}</td>
            {extra ? <td className="td print:hidden"></td> : null}
          </>
        )}
      </tr>
      {children}
    </>
  );
}
