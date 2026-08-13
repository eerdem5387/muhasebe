import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { add, mul, round } from "@/lib/money";
import { AppError, NotFoundError } from "@/lib/errors";
import { ACCOUNT_CODES } from "@/lib/chart-of-accounts";
import { postJournalEntry, JournalLineInput } from "./ledger";
import { resolveAccountIdsByCode } from "./engine";

export type PaymentChannel = "CASH" | "BANK" | "ON_ACCOUNT";

export interface ExpenseInput {
  tenantId: string;
  companyId: string;
  expenseAccountId: string;
  contactId?: string | null;
  netAmount: Prisma.Decimal.Value;
  taxRate?: Prisma.Decimal.Value; // percent
  via: PaymentChannel;
  date: Date;
  description?: string | null;
}

/**
 * Gider fişi: expense account (borç) + indirilecek KDV (borç) / kasa|banka|satıcılar (alacak).
 */
export async function recordExpense(input: ExpenseInput) {
  const net = round(input.netAmount);
  if (net.lte(0)) throw new AppError("Tutar sıfırdan büyük olmalıdır.");
  const tax = round(mul(net, new Prisma.Decimal(input.taxRate ?? 0).div(100)));
  const gross = add(net, tax);

  return prisma.$transaction(async (tx) => {
    const expenseAccount = await tx.account.findFirst({
      where: { id: input.expenseAccountId, tenantId: input.tenantId, companyId: input.companyId },
      select: { id: true },
    });
    if (!expenseAccount) throw new NotFoundError("Gider hesabı bulunamadı.");

    const creditCode =
      input.via === "CASH"
        ? ACCOUNT_CODES.CASH
        : input.via === "BANK"
          ? ACCOUNT_CODES.BANK
          : ACCOUNT_CODES.PAYABLE;

    const acc = await resolveAccountIdsByCode(tx, input.tenantId, input.companyId, [
      creditCode,
      ...(tax.gt(0) ? [ACCOUNT_CODES.DEDUCTIBLE_VAT] : []),
    ]);

    if (input.via === "ON_ACCOUNT") {
      if (!input.contactId) throw new AppError("Veresiye gider için cari seçilmelidir.");
      const contact = await tx.contact.findFirst({
        where: { id: input.contactId, tenantId: input.tenantId },
        select: { id: true },
      });
      if (!contact) throw new NotFoundError("Cari bulunamadı.");
    }

    const lines: JournalLineInput[] = [
      { accountId: input.expenseAccountId, debit: net },
      ...(tax.gt(0) ? [{ accountId: acc.get(ACCOUNT_CODES.DEDUCTIBLE_VAT)!, debit: tax }] : []),
      {
        accountId: acc.get(creditCode)!,
        contactId: input.via === "ON_ACCOUNT" ? input.contactId : null,
        credit: gross,
      },
    ];

    return postJournalEntry(tx, {
      tenantId: input.tenantId,
      companyId: input.companyId,
      date: input.date,
      description: input.description ?? "Gider fişi",
      documentType: "EXPENSE",
      lines,
    });
  });
}

export interface IncomeInput {
  tenantId: string;
  companyId: string;
  incomeAccountId: string;
  contactId?: string | null;
  netAmount: Prisma.Decimal.Value;
  taxRate?: Prisma.Decimal.Value;
  via: PaymentChannel;
  date: Date;
  description?: string | null;
}

/**
 * Gelir fişi: kasa|banka|alıcılar (borç) / gelir hesabı (alacak) + hesaplanan KDV (alacak).
 */
export async function recordIncome(input: IncomeInput) {
  const net = round(input.netAmount);
  if (net.lte(0)) throw new AppError("Tutar sıfırdan büyük olmalıdır.");
  const tax = round(mul(net, new Prisma.Decimal(input.taxRate ?? 0).div(100)));
  const gross = add(net, tax);

  return prisma.$transaction(async (tx) => {
    const incomeAccount = await tx.account.findFirst({
      where: { id: input.incomeAccountId, tenantId: input.tenantId, companyId: input.companyId },
      select: { id: true },
    });
    if (!incomeAccount) throw new NotFoundError("Gelir hesabı bulunamadı.");

    const debitCode =
      input.via === "CASH"
        ? ACCOUNT_CODES.CASH
        : input.via === "BANK"
          ? ACCOUNT_CODES.BANK
          : ACCOUNT_CODES.RECEIVABLE;

    const acc = await resolveAccountIdsByCode(tx, input.tenantId, input.companyId, [
      debitCode,
      ...(tax.gt(0) ? [ACCOUNT_CODES.OUTPUT_VAT] : []),
    ]);

    if (input.via === "ON_ACCOUNT" && !input.contactId) {
      throw new AppError("Veresiye gelir için cari seçilmelidir.");
    }

    const lines: JournalLineInput[] = [
      {
        accountId: acc.get(debitCode)!,
        contactId: input.via === "ON_ACCOUNT" ? input.contactId : null,
        debit: gross,
      },
      { accountId: input.incomeAccountId, credit: net },
      ...(tax.gt(0) ? [{ accountId: acc.get(ACCOUNT_CODES.OUTPUT_VAT)!, credit: tax }] : []),
    ];

    return postJournalEntry(tx, {
      tenantId: input.tenantId,
      companyId: input.companyId,
      date: input.date,
      description: input.description ?? "Gelir fişi",
      documentType: "INCOME",
      lines,
    });
  });
}

export interface ManualEntryInput {
  tenantId: string;
  companyId: string;
  date: Date;
  description?: string | null;
  lines: { accountId: string; contactId?: string | null; debit?: Prisma.Decimal.Value; credit?: Prisma.Decimal.Value }[];
}

/** Manuel yevmiye fişi: kullanıcının serbest girdiği dengeli fiş. */
export async function createManualEntry(input: ManualEntryInput) {
  return prisma.$transaction(async (tx) => {
    const accountIds = [...new Set(input.lines.map((l) => l.accountId))];
    const valid = await tx.account.findMany({
      where: { id: { in: accountIds }, tenantId: input.tenantId, companyId: input.companyId },
      select: { id: true },
    });
    if (valid.length !== accountIds.length) {
      throw new AppError("Seçilen hesaplardan biri bu şirkete ait değil.");
    }

    return postJournalEntry(tx, {
      tenantId: input.tenantId,
      companyId: input.companyId,
      date: input.date,
      description: input.description ?? "Manuel fiş",
      documentType: "MANUAL",
      lines: input.lines,
    });
  });
}

/** Bir yevmiye fişini ters kayıtla iptal eder (storno). */
export async function reverseLedgerEntry(tenantId: string, companyId: string, entryId: string) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.ledgerEntry.findFirst({
      where: { id: entryId, tenantId, companyId },
      include: { lines: true, reversedBy: true },
    });
    if (!entry) throw new NotFoundError("Yevmiye fişi bulunamadı.");
    if (entry.reversedBy) throw new AppError("Bu fiş zaten iptal edilmiş.");
    if (entry.reversalOfId) throw new AppError("İptal fişi tekrar iptal edilemez.");

    return postJournalEntry(tx, {
      tenantId,
      companyId,
      date: new Date(),
      description: `İptal (storno): ${entry.description ?? entry.documentType}`,
      documentType: entry.documentType,
      documentId: entry.documentId,
      reversalOfId: entry.id,
      lines: entry.lines.map((l) => ({
        accountId: l.accountId,
        contactId: l.contactId,
        debit: l.credit,
        credit: l.debit,
      })),
    });
  });
}
