import { CHANNEL_TR } from "@/lib/format";
import { CASHBOOK_CHANNEL_TR, cashbookTitle, type CashbookChannelKey, type IncomeCategoryKey } from "@/lib/cashbook";

export type LedgerTag = "PLANNED" | "CREDITED" | null;

export type MonthlyLedgerRow = {
  id: string;
  side: "INCOME" | "EXPENSE";
  amount: number;
  occurredAt: string;
  channelLabel: string;
  channel: CashbookChannelKey | null;
  bankName: string | null;
  checkInstallments: number | null;
  incomeCategory: IncomeCategoryKey | null;
  payerFirstName: string | null;
  payerLastName: string | null;
  payerIdentityNo: string | null;
  expenseTitle: string | null;
  payeeIdentityNo: string | null;
  invoiceNo: string | null;
  notes: string | null;
  /** null = elle eklenen kasa satırı */
  tag: LedgerTag;
  title: string;
  href: string | null;
  deletable: boolean;
};

// Tenant-scoped Prisma client (extended)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

function channelLabel(channel: string | null | undefined): string {
  if (!channel) return "—";
  if (channel in CHANNEL_TR) return CHANNEL_TR[channel];
  if (channel in CASHBOOK_CHANNEL_TR) {
    return CASHBOOK_CHANNEL_TR[channel as CashbookChannelKey];
  }
  return channel;
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0] ?? "", last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] ?? "" };
}

export async function loadMonthlyLedger(db: Db, yearMonth: string): Promise<{
  incomeRows: MonthlyLedgerRow[];
  expenseRows: MonthlyLedgerRow[];
}> {
  const [cashbook, scheduleLines, planLines] = await Promise.all([
    db.cashbookEntry.findMany({
      where: { yearMonth },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    }),
    db.incomeScheduleLine.findMany({
      where: { yearMonth },
      include: {
        enrollment: {
          select: {
            paymentChannel: true,
            student: { select: { id: true, fullName: true } },
          },
        },
      },
      orderBy: [{ releaseDate: "asc" }, { installmentIndex: "asc" }],
    }),
    // Öğrenci planları zaten IncomeScheduleLine olarak tutuluyor; çift sayımı önle.
    db.incomePlanLine.findMany({
      where: { yearMonth, plan: { enrollmentId: null } },
      include: {
        plan: {
          select: {
            paymentChannel: true,
            bankName: true,
            notes: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: [{ releaseDate: "asc" }, { installmentIndex: "asc" }],
    }),
  ]);

  const incomeRows: MonthlyLedgerRow[] = [];
  const expenseRows: MonthlyLedgerRow[] = [];

  for (const entry of cashbook) {
    const channel = entry.channel as CashbookChannelKey;
    const row: MonthlyLedgerRow = {
      id: entry.id,
      side: entry.side,
      amount: Number(entry.amount),
      occurredAt: entry.occurredAt.toISOString(),
      channel,
      channelLabel: CASHBOOK_CHANNEL_TR[channel] ?? String(channel),
      bankName: entry.bankName,
      checkInstallments: entry.checkInstallments,
      incomeCategory: entry.incomeCategory as IncomeCategoryKey | null,
      payerFirstName: entry.payerFirstName,
      payerLastName: entry.payerLastName,
      payerIdentityNo: entry.payerIdentityNo,
      expenseTitle: entry.expenseTitle,
      payeeIdentityNo: entry.payeeIdentityNo,
      invoiceNo: entry.invoiceNo,
      notes: entry.notes,
      tag: null,
      title: cashbookTitle({
        side: entry.side,
        incomeCategory: entry.incomeCategory,
        payerFirstName: entry.payerFirstName,
        payerLastName: entry.payerLastName,
        expenseTitle: entry.expenseTitle,
      }),
      href: null,
      deletable: true,
    };
    if (entry.side === "INCOME") incomeRows.push(row);
    else expenseRows.push(row);
  }

  for (const line of scheduleLines) {
    const { first, last } = splitName(line.enrollment.student.fullName);
    const channel = line.plannedChannel ?? line.enrollment.paymentChannel;
    const tag: LedgerTag = line.status === "REALIZED" ? "CREDITED" : "PLANNED";
    incomeRows.push({
      id: `schedule:${line.id}`,
      side: "INCOME",
      amount: Number(line.amount),
      occurredAt: line.releaseDate.toISOString(),
      channel: null,
      channelLabel: channelLabel(channel),
      bankName: null,
      checkInstallments: null,
      incomeCategory: "STUDENT",
      payerFirstName: first || null,
      payerLastName: last || null,
      payerIdentityNo: null,
      expenseTitle: null,
      payeeIdentityNo: null,
      invoiceNo: null,
      notes: null,
      tag,
      title: `Öğrenci · ${line.enrollment.student.fullName}`,
      href: `/students/${line.enrollment.student.id}`,
      deletable: false,
    });
  }

  for (const line of planLines) {
    const tag: LedgerTag = line.status === "REALIZED" ? "CREDITED" : "PLANNED";
    incomeRows.push({
      id: `plan:${line.id}`,
      side: "INCOME",
      amount: Number(line.amount),
      occurredAt: line.releaseDate.toISOString(),
      channel: null,
      channelLabel: channelLabel(line.plan.paymentChannel),
      bankName: line.plan.bankName,
      checkInstallments: null,
      incomeCategory: "OTHER",
      payerFirstName: null,
      payerLastName: null,
      payerIdentityNo: null,
      expenseTitle: null,
      payeeIdentityNo: null,
      invoiceNo: null,
      notes: line.plan.notes,
      tag,
      title: line.plan.category.name,
      href: "/collections",
      deletable: false,
    });
  }

  incomeRows.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  expenseRows.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

  return { incomeRows, expenseRows };
}

export function bookedTotal(rows: MonthlyLedgerRow[]): number {
  return rows.filter((r) => r.tag !== "PLANNED").reduce((s, r) => s + r.amount, 0);
}

export function plannedTotal(rows: MonthlyLedgerRow[]): number {
  return rows.filter((r) => r.tag === "PLANNED").reduce((s, r) => s + r.amount, 0);
}
