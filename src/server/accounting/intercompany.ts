import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { round } from "@/lib/money";
import { AppError, NotFoundError } from "@/lib/errors";
import { ACCOUNT_CODES } from "@/lib/chart-of-accounts";
import { postJournalEntry } from "./ledger";

export interface IntercompanyTransferInput {
  tenantId: string;
  fromCompanyId: string;
  toCompanyId: string;
  fromAccountId: string; // bank/cash account of the sending company
  toAccountId: string; // bank/cash account of the receiving company
  amount: Prisma.Decimal.Value;
  date: Date;
  description?: string | null;
}

async function requireGroupAccount(
  tx: Prisma.TransactionClient,
  tenantId: string,
  companyId: string,
  code: string,
): Promise<string> {
  const account = await tx.account.findFirst({
    where: { tenantId, companyId, code },
    select: { id: true },
  });
  if (!account) {
    throw new AppError(
      `Grup şirketi hesabı (${code}) bulunamadı. İlgili şirketin hesap planını kontrol edin.`,
    );
  }
  return account.id;
}

async function requireCompanyAccount(
  tx: Prisma.TransactionClient,
  tenantId: string,
  companyId: string,
  accountId: string,
): Promise<void> {
  const account = await tx.account.findFirst({
    where: { id: accountId, tenantId, companyId },
    select: { id: true },
  });
  if (!account) {
    throw new NotFoundError("Seçilen banka/kasa hesabı ilgili şirkete ait değil.");
  }
}

/**
 * Transfers money between two companies of the same tenant. Posts two balanced
 * journal entries in a single transaction:
 *  - Sending company:   Group receivable (borç) / Bank (alacak)
 *  - Receiving company:  Bank (borç)            / Group payable (alacak)
 * Either both entries and the transfer record commit, or nothing does.
 */
export async function createIntercompanyTransfer(input: IntercompanyTransferInput) {
  const amount = round(input.amount);
  if (amount.lte(0)) throw new AppError("Transfer tutarı sıfırdan büyük olmalıdır.");
  if (input.fromCompanyId === input.toCompanyId) {
    throw new AppError("Gönderen ve alan şirket aynı olamaz.");
  }

  return prisma.$transaction(async (tx) => {
    const companies = await tx.company.findMany({
      where: { tenantId: input.tenantId, id: { in: [input.fromCompanyId, input.toCompanyId] } },
      select: { id: true },
    });
    if (companies.length !== 2) {
      throw new NotFoundError("Şirketlerden biri bulunamadı veya bu tenant'a ait değil.");
    }

    await requireCompanyAccount(tx, input.tenantId, input.fromCompanyId, input.fromAccountId);
    await requireCompanyAccount(tx, input.tenantId, input.toCompanyId, input.toAccountId);

    const groupReceivable = await requireGroupAccount(
      tx,
      input.tenantId,
      input.fromCompanyId,
      ACCOUNT_CODES.GROUP_RECEIVABLE,
    );
    const groupPayable = await requireGroupAccount(
      tx,
      input.tenantId,
      input.toCompanyId,
      ACCOUNT_CODES.GROUP_PAYABLE,
    );

    const transfer = await tx.intercompanyTransfer.create({
      data: {
        tenantId: input.tenantId,
        fromCompanyId: input.fromCompanyId,
        toCompanyId: input.toCompanyId,
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        amount,
        date: input.date,
        description: input.description ?? null,
      },
    });

    const description = input.description ?? "Şirketler arası transfer";

    // Sending company: Group receivable (debit) / Bank (credit)
    await postJournalEntry(tx, {
      tenantId: input.tenantId,
      companyId: input.fromCompanyId,
      date: input.date,
      description: `${description} (gönderen)`,
      documentType: "TRANSFER",
      documentId: transfer.id,
      lines: [
        { accountId: groupReceivable, debit: amount },
        { accountId: input.fromAccountId, credit: amount },
      ],
    });

    // Receiving company: Bank (debit) / Group payable (credit)
    await postJournalEntry(tx, {
      tenantId: input.tenantId,
      companyId: input.toCompanyId,
      date: input.date,
      description: `${description} (alan)`,
      documentType: "TRANSFER",
      documentId: transfer.id,
      lines: [
        { accountId: input.toAccountId, debit: amount },
        { accountId: groupPayable, credit: amount },
      ],
    });

    return transfer;
  });
}
