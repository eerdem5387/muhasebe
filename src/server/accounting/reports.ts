import type { AccountType, DocumentType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { add, decimalToString, money, sub, ZERO } from "@/lib/money";
import { ACCOUNT_CODES } from "@/lib/chart-of-accounts";
import type { TenantDb } from "@/lib/prisma";

interface DateRange {
  from?: Date;
  to?: Date;
}

function dateWhere(range: DateRange) {
  if (!range.from && !range.to) return {};
  return {
    date: {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lte: range.to } : {}),
    },
  };
}

export interface AccountTotal {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
}

/** Per-account debit/credit totals for a company, optionally within a date range. */
export async function getAccountTotals(
  db: TenantDb,
  companyId: string,
  range: DateRange = {},
): Promise<AccountTotal[]> {
  const grouped = await db.ledgerLine.groupBy({
    by: ["accountId"],
    where: { ledgerEntry: { companyId, ...dateWhere(range) } },
    _sum: { debit: true, credit: true },
  });
  const accounts = await db.account.findMany({
    where: { companyId },
    select: { id: true, code: true, name: true, type: true },
  });
  const map = new Map(accounts.map((a) => [a.id, a]));
  return grouped.map((g) => {
    const a = map.get(g.accountId);
    return {
      accountId: g.accountId,
      code: a?.code ?? "?",
      name: a?.name ?? "?",
      type: a?.type ?? "ASSET",
      debit: money(g._sum.debit ?? 0),
      credit: money(g._sum.credit ?? 0),
    };
  });
}

export interface VatSummary {
  outputVat: string; // hesaplanan (391)
  deductibleVat: string; // indirilecek (191)
  payable: string; // ödenecek KDV (output - deductible), negatif = devreden
}

export async function getVatSummary(db: TenantDb, companyId: string, range: DateRange = {}): Promise<VatSummary> {
  const totals = await getAccountTotals(db, companyId, range);
  const output = totals.find((t) => t.code === ACCOUNT_CODES.OUTPUT_VAT);
  const deductible = totals.find((t) => t.code === ACCOUNT_CODES.DEDUCTIBLE_VAT);
  const outputVat = output ? sub(output.credit, output.debit) : ZERO;
  const deductibleVat = deductible ? sub(deductible.debit, deductible.credit) : ZERO;
  return {
    outputVat: decimalToString(outputVat),
    deductibleVat: decimalToString(deductibleVat),
    payable: decimalToString(sub(outputVat, deductibleVat)),
  };
}

export interface StatementLineRow {
  code: string;
  name: string;
  amount: string;
}

export interface IncomeStatement {
  revenues: StatementLineRow[];
  expenses: StatementLineRow[];
  totalRevenue: string;
  totalExpense: string;
  netProfit: string;
}

export async function getIncomeStatement(db: TenantDb, companyId: string, range: DateRange = {}): Promise<IncomeStatement> {
  const totals = await getAccountTotals(db, companyId, range);
  let totalRevenue = ZERO;
  let totalExpense = ZERO;
  const revenues: StatementLineRow[] = [];
  const expenses: StatementLineRow[] = [];

  for (const t of totals) {
    if (t.type === "REVENUE") {
      const amt = sub(t.credit, t.debit);
      totalRevenue = add(totalRevenue, amt);
      revenues.push({ code: t.code, name: t.name, amount: decimalToString(amt) });
    } else if (t.type === "EXPENSE") {
      const amt = sub(t.debit, t.credit);
      totalExpense = add(totalExpense, amt);
      expenses.push({ code: t.code, name: t.name, amount: decimalToString(amt) });
    }
  }
  revenues.sort((a, b) => a.code.localeCompare(b.code));
  expenses.sort((a, b) => a.code.localeCompare(b.code));

  return {
    revenues,
    expenses,
    totalRevenue: decimalToString(totalRevenue),
    totalExpense: decimalToString(totalExpense),
    netProfit: decimalToString(sub(totalRevenue, totalExpense)),
  };
}

export interface BalanceSheet {
  assets: StatementLineRow[];
  liabilities: StatementLineRow[];
  equity: StatementLineRow[];
  totalAssets: string;
  totalLiabilities: string;
  totalEquity: string;
  netProfit: string;
}

export async function getBalanceSheet(db: TenantDb, companyId: string): Promise<BalanceSheet> {
  const totals = await getAccountTotals(db, companyId);
  const assets: StatementLineRow[] = [];
  const liabilities: StatementLineRow[] = [];
  const equity: StatementLineRow[] = [];
  let totalAssets = ZERO;
  let totalLiabilities = ZERO;
  let totalEquity = ZERO;
  let revenue = ZERO;
  let expense = ZERO;

  for (const t of totals) {
    if (t.type === "ASSET") {
      const amt = sub(t.debit, t.credit);
      totalAssets = add(totalAssets, amt);
      assets.push({ code: t.code, name: t.name, amount: decimalToString(amt) });
    } else if (t.type === "LIABILITY") {
      const amt = sub(t.credit, t.debit);
      totalLiabilities = add(totalLiabilities, amt);
      liabilities.push({ code: t.code, name: t.name, amount: decimalToString(amt) });
    } else if (t.type === "EQUITY") {
      const amt = sub(t.credit, t.debit);
      totalEquity = add(totalEquity, amt);
      equity.push({ code: t.code, name: t.name, amount: decimalToString(amt) });
    } else if (t.type === "REVENUE") {
      revenue = add(revenue, sub(t.credit, t.debit));
    } else if (t.type === "EXPENSE") {
      expense = add(expense, sub(t.debit, t.credit));
    }
  }

  const netProfit = sub(revenue, expense);
  // Dönem net kâr/zararı özkaynaklara eklenir (bilanço denkliği için).
  equity.push({ code: "590", name: "Dönem Net Kârı/Zararı", amount: decimalToString(netProfit) });
  totalEquity = add(totalEquity, netProfit);

  [assets, liabilities, equity].forEach((arr) => arr.sort((a, b) => a.code.localeCompare(b.code)));

  return {
    assets,
    liabilities,
    equity,
    totalAssets: decimalToString(totalAssets),
    totalLiabilities: decimalToString(totalLiabilities),
    totalEquity: decimalToString(totalEquity),
    netProfit: decimalToString(netProfit),
  };
}

export interface AgingRow {
  contactId: string;
  contactName: string;
  b0_30: number;
  b31_60: number;
  b61_90: number;
  b90plus: number;
  total: number;
}

/**
 * Cari yaşlandırma (FIFO): 120 Alıcılar (RECEIVABLE) veya 320 Satıcılar (PAYABLE)
 * hesabındaki açık bakiyeleri hareket yaşına göre gruplar.
 */
export async function getAging(
  db: TenantDb,
  companyId: string,
  kind: "RECEIVABLE" | "PAYABLE",
): Promise<AgingRow[]> {
  const code = kind === "RECEIVABLE" ? ACCOUNT_CODES.RECEIVABLE : ACCOUNT_CODES.PAYABLE;
  const account = await db.account.findFirst({ where: { companyId, code }, select: { id: true } });
  if (!account) return [];

  const lines = await db.ledgerLine.findMany({
    where: { accountId: account.id, contactId: { not: null }, ledgerEntry: { companyId } },
    include: { ledgerEntry: { select: { date: true } }, contact: { select: { name: true } } },
    orderBy: [{ ledgerEntry: { date: "asc" } }, { createdAt: "asc" }],
  });

  // Group by contact, FIFO-match reductions against increases.
  const byContact = new Map<string, { name: string; open: { amount: number; date: Date }[] }>();
  const now = Date.now();

  for (const l of lines) {
    const cid = l.contactId!;
    if (!byContact.has(cid)) byContact.set(cid, { name: l.contact?.name ?? "?", open: [] });
    const bucket = byContact.get(cid)!;
    // For receivable: debit increases open; credit reduces. For payable: reverse.
    const increase = kind === "RECEIVABLE" ? Number(l.debit) - Number(l.credit) : Number(l.credit) - Number(l.debit);
    if (increase > 0) {
      bucket.open.push({ amount: increase, date: l.ledgerEntry.date });
    } else if (increase < 0) {
      let toConsume = -increase;
      while (toConsume > 0.0001 && bucket.open.length > 0) {
        const head = bucket.open[0];
        if (head.amount <= toConsume + 0.0001) {
          toConsume -= head.amount;
          bucket.open.shift();
        } else {
          head.amount -= toConsume;
          toConsume = 0;
        }
      }
    }
  }

  const rows: AgingRow[] = [];
  for (const [cid, data] of byContact) {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0;
    for (const o of data.open) {
      const days = Math.floor((now - o.date.getTime()) / 86_400_000);
      if (days <= 30) b0 += o.amount;
      else if (days <= 60) b1 += o.amount;
      else if (days <= 90) b2 += o.amount;
      else b3 += o.amount;
    }
    const total = b0 + b1 + b2 + b3;
    if (Math.abs(total) > 0.01) {
      rows.push({ contactId: cid, contactName: data.name, b0_30: b0, b31_60: b1, b61_90: b2, b90plus: b3, total });
    }
  }
  return rows.sort((a, b) => b.total - a.total);
}

export interface StatementRow {
  entryId: string;
  lineId: string;
  date: string;
  description: string | null;
  documentType: DocumentType;
  accountCode: string;
  accountName: string;
  debit: string;
  credit: string;
  balance: string; // cumulative (debit - credit)
}

export interface ContactStatement {
  rows: StatementRow[];
  totalDebit: string;
  totalCredit: string;
  closingBalance: string;
}

export interface StatementFilters {
  from?: Date;
  to?: Date;
}

/**
 * Cari Ekstre: all ledger movements for a contact within a specific company,
 * with a cumulative running balance. `db` must be a tenant-scoped client so the
 * query is automatically isolated to the caller's tenant.
 *
 * Equivalent raw SQL (illustrative):
 *   SELECT le.date, le.description, a.code, a.name, ll.debit, ll.credit,
 *          SUM(ll.debit - ll.credit) OVER (ORDER BY le.date, ll."createdAt") AS balance
 *   FROM "LedgerLine" ll
 *   JOIN "LedgerEntry" le ON le.id = ll."ledgerEntryId"
 *   JOIN "Account" a ON a.id = ll."accountId"
 *   WHERE ll."tenantId" = $tenant AND le."companyId" = $company AND ll."contactId" = $contact
 *   ORDER BY le.date ASC, ll."createdAt" ASC;
 */
export async function getContactStatement(
  db: TenantDb,
  companyId: string,
  contactId: string,
  filters: StatementFilters = {},
): Promise<ContactStatement> {
  const lines = await db.ledgerLine.findMany({
    where: {
      contactId,
      ledgerEntry: {
        companyId,
        ...(filters.from || filters.to
          ? { date: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
          : {}),
      },
    },
    include: {
      ledgerEntry: { select: { id: true, date: true, description: true, documentType: true } },
      account: { select: { code: true, name: true } },
    },
    orderBy: [{ ledgerEntry: { date: "asc" } }, { createdAt: "asc" }],
  });

  let running = ZERO;
  let totalDebit = ZERO;
  let totalCredit = ZERO;

  const rows: StatementRow[] = lines.map((line) => {
    running = add(running, sub(line.debit, line.credit));
    totalDebit = add(totalDebit, line.debit);
    totalCredit = add(totalCredit, line.credit);
    return {
      entryId: line.ledgerEntry.id,
      lineId: line.id,
      date: line.ledgerEntry.date.toISOString(),
      description: line.ledgerEntry.description,
      documentType: line.ledgerEntry.documentType,
      accountCode: line.account.code,
      accountName: line.account.name,
      debit: decimalToString(line.debit),
      credit: decimalToString(line.credit),
      balance: decimalToString(running),
    };
  });

  return {
    rows,
    totalDebit: decimalToString(totalDebit),
    totalCredit: decimalToString(totalCredit),
    closingBalance: decimalToString(running),
  };
}

export interface AccountLedgerRow {
  lineId: string;
  date: string;
  description: string | null;
  documentType: DocumentType;
  contactName: string | null;
  debit: string;
  credit: string;
  balance: string;
}

export interface AccountLedger {
  rows: AccountLedgerRow[];
  totalDebit: string;
  totalCredit: string;
  closingBalance: string;
}

/** Defter-i Kebir: tek bir hesabın tüm hareketleri ve kümülatif bakiyesi. */
export async function getAccountLedger(
  db: TenantDb,
  companyId: string,
  accountId: string,
): Promise<AccountLedger> {
  const lines = await db.ledgerLine.findMany({
    where: { accountId, ledgerEntry: { companyId } },
    include: {
      ledgerEntry: { select: { date: true, description: true, documentType: true } },
      contact: { select: { name: true } },
    },
    orderBy: [{ ledgerEntry: { date: "asc" } }, { createdAt: "asc" }],
  });

  let running = ZERO;
  let totalDebit = ZERO;
  let totalCredit = ZERO;
  const rows: AccountLedgerRow[] = lines.map((l) => {
    running = add(running, sub(l.debit, l.credit));
    totalDebit = add(totalDebit, l.debit);
    totalCredit = add(totalCredit, l.credit);
    return {
      lineId: l.id,
      date: l.ledgerEntry.date.toISOString(),
      description: l.ledgerEntry.description,
      documentType: l.ledgerEntry.documentType,
      contactName: l.contact?.name ?? null,
      debit: decimalToString(l.debit),
      credit: decimalToString(l.credit),
      balance: decimalToString(running),
    };
  });

  return {
    rows,
    totalDebit: decimalToString(totalDebit),
    totalCredit: decimalToString(totalCredit),
    closingBalance: decimalToString(running),
  };
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  debit: string;
  credit: string;
  balance: string;
}

export interface TrialBalance {
  rows: TrialBalanceRow[];
  totalDebit: string;
  totalCredit: string;
}

/** Mizan: per-account debit/credit totals for a company. */
export async function getTrialBalance(
  db: TenantDb,
  companyId: string,
): Promise<TrialBalance> {
  const grouped = await db.ledgerLine.groupBy({
    by: ["accountId"],
    where: { ledgerEntry: { companyId } },
    _sum: { debit: true, credit: true },
  });

  const accountIds = grouped.map((g) => g.accountId);
  const accounts = await db.account.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, code: true, name: true },
  });
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  let totalDebit = ZERO;
  let totalCredit = ZERO;

  const rows: TrialBalanceRow[] = grouped
    .map((g) => {
      const acc = accountMap.get(g.accountId);
      const debit = g._sum.debit ?? ZERO;
      const credit = g._sum.credit ?? ZERO;
      totalDebit = add(totalDebit, debit);
      totalCredit = add(totalCredit, credit);
      return {
        accountId: g.accountId,
        code: acc?.code ?? "?",
        name: acc?.name ?? "Bilinmeyen hesap",
        debit: decimalToString(debit),
        credit: decimalToString(credit),
        balance: decimalToString(sub(debit, credit)),
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));

  return {
    rows,
    totalDebit: decimalToString(totalDebit),
    totalCredit: decimalToString(totalCredit),
  };
}
