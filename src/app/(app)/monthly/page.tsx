import { requireAuth, canManageOperations } from "@/lib/context";
import { fmtMoney, fmtMonthUpper, toYearMonth } from "@/lib/format";
import { bookedTotal, loadMonthlyLedger, plannedTotal } from "@/server/monthly-ledger";
import { MonthToolbar } from "./month-toolbar";
import { IncomeAddModal, ExpenseAddModal } from "./entry-form";
import { HistoricalCashbookModal } from "./historical-entry-modal";
import { CashbookPanel } from "./cashbook-panel";
import { ChannelSpendCard } from "./channel-spend";

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

  const [{ incomeRows, expenseRows }, students, bankAccountRows, cardBankRows] = await Promise.all([
    loadMonthlyLedger(ctx.db, month),
    ctx.db.student.findMany({
      select: { id: true, fullName: true, classroom: true },
      orderBy: { fullName: "asc" },
      take: 2000,
    }),
    ctx.db.bankAccountSetting.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    ctx.db.cardBankSetting.findMany({
      where: { active: true },
      orderBy: { bankName: "asc" },
      select: { id: true, bankName: true },
    }),
  ]);
  const bankAccounts = bankAccountRows.map((a) => ({ id: a.id, name: a.name }));
  const cardBanks = cardBankRows.map((c) => ({ id: c.id, name: c.bankName }));
  const incomeBooked = bookedTotal(incomeRows);
  const incomePlanned = plannedTotal(incomeRows);
  const expenseBooked = bookedTotal(expenseRows);
  const net = incomeBooked - expenseBooked;

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-[1.75rem]">
            Aylık gelir-gider
          </h1>
          {canWrite ? (
            <HistoricalCashbookModal
              students={students}
              bankAccounts={bankAccounts}
              cardBanks={cardBanks}
            />
          ) : null}
        </div>
        <MonthToolbar month={month} />
      </div>

      <div className="monthly-report overflow-hidden">
        <div className="border-b-2 border-slate-800 px-4 py-4 text-center">
          <p className="text-sm font-semibold tracking-wide text-slate-500">{ctx.tenantName}</p>
          <h2 className="mt-1 text-xl font-bold uppercase tracking-wide text-slate-900">
            {fmtMonthUpper(month)} tarihli gelir gider ödeme özet tablosu
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2">
          <section className="border-b-[3px] border-slate-800 lg:border-b-0 lg:border-r-[3px]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-800 bg-white px-4 py-3">
              <h3 className="text-base font-bold uppercase tracking-wide text-slate-900">Gelirler</h3>
              {canWrite ? (
                <div className="print:hidden">
                  <IncomeAddModal
                    month={month}
                    students={students}
                    bankAccounts={bankAccounts}
                    cardBanks={cardBanks}
                  />
                </div>
              ) : null}
            </div>
            <CashbookPanel
              side="INCOME"
              month={month}
              rows={incomeRows}
              canWrite={canWrite}
              bookedTotal={incomeBooked}
              plannedTotal={incomePlanned}
              bankAccounts={bankAccounts}
              cardBanks={cardBanks}
            />
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-800 bg-white px-4 py-3">
              <h3 className="text-base font-bold uppercase tracking-wide text-slate-900">Giderler</h3>
              {canWrite ? (
                <div className="print:hidden">
                  <ExpenseAddModal
                    month={month}
                    bankAccounts={bankAccounts}
                    cardBanks={cardBanks}
                  />
                </div>
              ) : null}
            </div>
            <CashbookPanel
              side="EXPENSE"
              month={month}
              rows={expenseRows}
              canWrite={canWrite}
              bookedTotal={expenseBooked}
              bankAccounts={bankAccounts}
              cardBanks={cardBanks}
            />
          </section>
        </div>

        <div
          className={`border-t-[3px] border-slate-800 px-4 py-3 text-right text-sm font-semibold ${
            net >= 0 ? "text-emerald-700" : "text-red-700"
          }`}
        >
          Net (hesaba geçen gelir − gider): {fmtMoney(net)}
          {incomePlanned > 0 ? (
            <span className="mt-1 block text-xs font-medium text-amber-800">
              + Planlanmış gelir: {fmtMoney(incomePlanned)}
            </span>
          ) : null}
        </div>
      </div>

      <ChannelSpendCard expenseRows={expenseRows} />
    </div>
  );
}
