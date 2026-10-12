import { requireAuth, canManageOperations } from "@/lib/context";
import { PageHeader } from "@/components/page-header";
import { fmtMoney, fmtMonthUpper, toYearMonth } from "@/lib/format";
import { MonthToolbar } from "./month-toolbar";
import { IncomeAddModal, ExpenseAddModal } from "./entry-form";
import { CashbookPanel, type CashbookRow } from "./cashbook-panel";

function parseMonth(raw: string | undefined): string {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw;
  return toYearMonth(new Date());
}

function toRow(entry: {
  id: string;
  side: "INCOME" | "EXPENSE";
  amount: { toString(): string } | number;
  occurredAt: Date;
  channel: CashbookRow["channel"];
  bankName: string | null;
  checkInstallments: number | null;
  incomeCategory: CashbookRow["incomeCategory"];
  payerFirstName: string | null;
  payerLastName: string | null;
  payerIdentityNo: string | null;
  expenseTitle: string | null;
  payeeIdentityNo: string | null;
  invoiceNo: string | null;
  notes: string | null;
}): CashbookRow {
  return {
    id: entry.id,
    side: entry.side,
    amount: Number(entry.amount),
    occurredAt: entry.occurredAt.toISOString(),
    channel: entry.channel,
    bankName: entry.bankName,
    checkInstallments: entry.checkInstallments,
    incomeCategory: entry.incomeCategory,
    payerFirstName: entry.payerFirstName,
    payerLastName: entry.payerLastName,
    payerIdentityNo: entry.payerIdentityNo,
    expenseTitle: entry.expenseTitle,
    payeeIdentityNo: entry.payeeIdentityNo,
    invoiceNo: entry.invoiceNo,
    notes: entry.notes,
  };
}

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const ctx = await requireAuth();
  const canWrite = canManageOperations(ctx.role, ctx.isSuperAdmin);
  const month = parseMonth((await searchParams).month);

  const entries = await ctx.db.cashbookEntry.findMany({
    where: { yearMonth: month },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
  });

  const incomeRows = entries.filter((e) => e.side === "INCOME").map(toRow);
  const expenseRows = entries.filter((e) => e.side === "EXPENSE").map(toRow);
  const incomeTotal = incomeRows.reduce((s, r) => s + r.amount, 0);
  const expenseTotal = expenseRows.reduce((s, r) => s + r.amount, 0);
  const net = incomeTotal - expenseTotal;

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title="Aylık gelir-gider"
          description="Gelir ve giderleri buradan kaydedin (Gider ekle). Satıra tıklayarak detayı açabilirsiniz."
          actions={<MonthToolbar month={month} />}
        />
      </div>

      <div className="monthly-report overflow-hidden card">
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
                  <IncomeAddModal month={month} />
                </div>
              ) : null}
            </div>
            <CashbookPanel side="INCOME" month={month} rows={incomeRows} canWrite={canWrite} />
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-800 bg-white px-4 py-3">
              <h3 className="text-base font-bold uppercase tracking-wide text-slate-900">Giderler</h3>
              {canWrite ? (
                <div className="print:hidden">
                  <ExpenseAddModal month={month} />
                </div>
              ) : null}
            </div>
            <CashbookPanel side="EXPENSE" month={month} rows={expenseRows} canWrite={canWrite} />
          </section>
        </div>

        <div
          className={`border-t-[3px] border-slate-800 px-4 py-3 text-right text-sm font-semibold ${
            net >= 0 ? "text-emerald-700" : "text-red-700"
          }`}
        >
          Net (gelir − gider): {fmtMoney(net)}
        </div>
      </div>
    </div>
  );
}
