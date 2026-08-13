import { Prisma, DocumentType } from "@prisma/client";
import { add, equals, round, ZERO } from "@/lib/money";
import { AppError, UnbalancedLedgerError } from "@/lib/errors";

export interface JournalLineInput {
  accountId: string;
  contactId?: string | null;
  debit?: Prisma.Decimal.Value;
  credit?: Prisma.Decimal.Value;
}

export interface JournalEntryInput {
  tenantId: string;
  companyId: string;
  date: Date;
  description?: string | null;
  documentType: DocumentType;
  documentId?: string | null;
  reversalOfId?: string | null;
  lines: JournalLineInput[];
}

/**
 * Posts a balanced double-entry journal entry (yevmiye fişi) within an existing
 * transaction. Throws {@link UnbalancedLedgerError} when total debit != total
 * credit, which rolls back the surrounding transaction (ACID guarantee).
 *
 * `tx` is the raw transaction client, so `tenantId` is set explicitly on every
 * row rather than relying on the tenant-scoping extension.
 */
export async function postJournalEntry(
  tx: Prisma.TransactionClient,
  input: JournalEntryInput,
) {
  if (input.lines.length < 2) {
    throw new AppError("Bir yevmiye fişi en az iki satır içermelidir.");
  }

  let debitTotal = ZERO;
  let creditTotal = ZERO;

  const lineData = input.lines.map((line) => {
    const debit = round(line.debit ?? 0);
    const credit = round(line.credit ?? 0);

    if (debit.lt(0) || credit.lt(0)) {
      throw new AppError("Borç ve alacak tutarları negatif olamaz.");
    }
    if (!debit.isZero() && !credit.isZero()) {
      throw new AppError("Bir satır hem borç hem alacak içeremez.");
    }

    debitTotal = add(debitTotal, debit);
    creditTotal = add(creditTotal, credit);

    return {
      tenantId: input.tenantId,
      accountId: line.accountId,
      contactId: line.contactId ?? null,
      debit,
      credit,
    };
  });

  if (debitTotal.lte(0)) {
    throw new AppError("Yevmiye fişi tutarı sıfırdan büyük olmalıdır.");
  }

  if (!equals(debitTotal, creditTotal)) {
    throw new UnbalancedLedgerError(debitTotal.toFixed(2), creditTotal.toFixed(2));
  }

  return tx.ledgerEntry.create({
    data: {
      tenantId: input.tenantId,
      companyId: input.companyId,
      date: input.date,
      description: input.description ?? null,
      documentType: input.documentType,
      documentId: input.documentId ?? null,
      reversalOfId: input.reversalOfId ?? null,
      lines: { create: lineData },
    },
    include: { lines: true },
  });
}
