import { randomUUID } from "crypto";
import { Prisma, InvoiceType, EInvoiceProfile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { add, money, mul, round, sub, ZERO } from "@/lib/money";
import { AppError, NotFoundError } from "@/lib/errors";
import { ACCOUNT_CODES } from "@/lib/chart-of-accounts";
import { postJournalEntry } from "./ledger";

export type PriceMode = "EXCLUSIVE" | "INCLUSIVE";

export interface InvoiceLineDraft {
  productId?: string | null;
  description?: string | null;
  unit?: string | null;
  quantity: Prisma.Decimal.Value;
  unitPrice: Prisma.Decimal.Value;
  discountRate?: Prisma.Decimal.Value; // percentage, e.g. 10 for %10
  taxRate: Prisma.Decimal.Value; // percentage, e.g. 20 for %20
  taxId?: string | null;
}

export interface ComputedLine {
  productId: string | null;
  description: string | null;
  unit: string;
  taxId: string | null;
  taxRate: Prisma.Decimal;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  discountRate: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  net: Prisma.Decimal;
  tax: Prisma.Decimal;
  lineTotal: Prisma.Decimal; // gross (net + tax)
}

export interface InvoiceComputation {
  lines: ComputedLine[];
  netTotal: Prisma.Decimal;
  discountTotal: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
}

/**
 * Pure computation of invoice line and total figures, supporting KDV-included
 * (INCLUSIVE) and KDV-excluded (EXCLUSIVE) pricing plus per-line discount (İskonto).
 */
export function computeInvoice(
  lines: InvoiceLineDraft[],
  priceMode: PriceMode,
): InvoiceComputation {
  let netTotal = ZERO;
  let taxTotal = ZERO;
  let discountTotal = ZERO;

  const computed = lines.map((line) => {
    const quantity = money(line.quantity);
    const unitPrice = money(line.unitPrice);
    const rate = money(line.taxRate);
    const discRate = money(line.discountRate ?? 0);
    const gross = mul(quantity, unitPrice);
    const discountAmount = round(mul(gross, discRate.div(100)));
    const base = sub(gross, discountAmount); // iskonto sonrası tutar

    let net: Prisma.Decimal;
    let tax: Prisma.Decimal;

    if (priceMode === "INCLUSIVE") {
      const divisor = add(1, rate.div(100));
      net = round(base.div(divisor));
      tax = round(sub(base, net));
    } else {
      net = round(base);
      tax = round(mul(net, rate.div(100)));
    }

    const lineTotal = add(net, tax);
    netTotal = add(netTotal, net);
    taxTotal = add(taxTotal, tax);
    discountTotal = add(discountTotal, discountAmount);

    return {
      productId: line.productId ?? null,
      description: line.description ?? null,
      unit: line.unit || "Adet",
      taxId: line.taxId ?? null,
      taxRate: rate,
      quantity,
      unitPrice,
      discountRate: discRate,
      discountAmount,
      net,
      tax,
      lineTotal,
    } satisfies ComputedLine;
  });

  return {
    lines: computed,
    netTotal: round(netTotal),
    discountTotal: round(discountTotal),
    taxTotal: round(taxTotal),
    grandTotal: round(add(netTotal, taxTotal)),
  };
}

export async function resolveAccountIdsByCode(
  tx: Prisma.TransactionClient,
  tenantId: string,
  companyId: string,
  codes: string[],
): Promise<Map<string, string>> {
  const accounts = await tx.account.findMany({
    where: { tenantId, companyId, code: { in: codes } },
    select: { id: true, code: true },
  });
  const map = new Map(accounts.map((a) => [a.code, a.id]));
  for (const code of codes) {
    if (!map.has(code)) {
      throw new AppError(
        `Zorunlu hesap bulunamadı: ${code}. Şirketin hesap planını kontrol edin.`,
      );
    }
  }
  return map;
}

export interface CreateInvoiceInput {
  tenantId: string;
  companyId: string;
  type: InvoiceType;
  contactId: string;
  invoiceNumber: string;
  issueDate: Date;
  priceMode: PriceMode;
  note?: string | null;
  dueDate?: Date | null;
  einvoiceProfile?: EInvoiceProfile;
  dispatchType?: string | null;
  lines: {
    productId?: string | null;
    description?: string | null;
    unit?: string | null;
    quantity: Prisma.Decimal.Value;
    unitPrice: Prisma.Decimal.Value;
    discountRate?: Prisma.Decimal.Value;
    taxId?: string | null;
  }[];
}

/**
 * Creates an invoice with its lines and automatically posts the corresponding
 * double-entry journal entry, all inside a single database transaction. If the
 * ledger fails to balance the whole operation is rolled back.
 */
export async function createInvoiceWithPosting(input: CreateInvoiceInput) {
  return prisma.$transaction(async (tx) => {
    const contact = await tx.contact.findFirst({
      where: { id: input.contactId, tenantId: input.tenantId },
      select: { id: true },
    });
    if (!contact) throw new NotFoundError("Cari bulunamadı.");

    // Resolve tax rates for the referenced taxes (tenant-shared).
    const taxIds = [...new Set(input.lines.map((l) => l.taxId).filter(Boolean))] as string[];
    const taxes = taxIds.length
      ? await tx.tax.findMany({
          where: { id: { in: taxIds }, tenantId: input.tenantId },
          select: { id: true, rate: true },
        })
      : [];
    const taxRate = new Map(taxes.map((t) => [t.id, t.rate]));

    const drafts: InvoiceLineDraft[] = input.lines.map((l) => ({
      productId: l.productId ?? null,
      description: l.description ?? null,
      unit: l.unit ?? null,
      taxId: l.taxId ?? null,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountRate: l.discountRate ?? 0,
      taxRate: l.taxId ? (taxRate.get(l.taxId) ?? 0) : 0,
    }));

    const computation = computeInvoice(drafts, input.priceMode);
    const profile = input.einvoiceProfile ?? "NONE";

    const invoice = await tx.invoice.create({
      data: {
        tenantId: input.tenantId,
        companyId: input.companyId,
        contactId: input.contactId,
        type: input.type,
        status: "ISSUED",
        einvoiceProfile: profile,
        ettn: profile === "NONE" ? null : randomUUID().toUpperCase(),
        dispatchType: input.dispatchType || "ELEKTRONIK",
        invoiceNumber: input.invoiceNumber,
        issueDate: input.issueDate,
        dueDate: input.dueDate ?? null,
        note: input.note ?? null,
        netTotal: computation.netTotal,
        discountTotal: computation.discountTotal,
        taxTotal: computation.taxTotal,
        grandTotal: computation.grandTotal,
        lines: {
          create: computation.lines.map((line) => ({
            tenantId: input.tenantId,
            productId: line.productId,
            description: line.description,
            unit: line.unit,
            taxId: line.taxId,
            taxRate: line.taxRate,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountRate: line.discountRate,
            discountAmount: line.discountAmount,
            netAmount: line.net,
            taxAmount: line.tax,
            lineTotal: line.lineTotal,
          })),
        },
      },
    });

    const codes =
      input.type === "SALES"
        ? [ACCOUNT_CODES.RECEIVABLE, ACCOUNT_CODES.SALES_REVENUE, ACCOUNT_CODES.OUTPUT_VAT]
        : [ACCOUNT_CODES.INVENTORY, ACCOUNT_CODES.DEDUCTIBLE_VAT, ACCOUNT_CODES.PAYABLE];

    const acc = await resolveAccountIdsByCode(tx, input.tenantId, input.companyId, codes);

    const journalLines =
      input.type === "SALES"
        ? [
            {
              accountId: acc.get(ACCOUNT_CODES.RECEIVABLE)!,
              contactId: input.contactId,
              debit: computation.grandTotal,
            },
            { accountId: acc.get(ACCOUNT_CODES.SALES_REVENUE)!, credit: computation.netTotal },
            ...(computation.taxTotal.gt(0)
              ? [{ accountId: acc.get(ACCOUNT_CODES.OUTPUT_VAT)!, credit: computation.taxTotal }]
              : []),
          ]
        : [
            { accountId: acc.get(ACCOUNT_CODES.INVENTORY)!, debit: computation.netTotal },
            ...(computation.taxTotal.gt(0)
              ? [{ accountId: acc.get(ACCOUNT_CODES.DEDUCTIBLE_VAT)!, debit: computation.taxTotal }]
              : []),
            {
              accountId: acc.get(ACCOUNT_CODES.PAYABLE)!,
              contactId: input.contactId,
              credit: computation.grandTotal,
            },
          ];

    await postJournalEntry(tx, {
      tenantId: input.tenantId,
      companyId: input.companyId,
      date: input.issueDate,
      description: `${input.type === "SALES" ? "Satış" : "Alış"} Faturası #${input.invoiceNumber}`,
      documentType: "INVOICE",
      documentId: invoice.id,
      lines: journalLines,
    });

    return invoice;
  });
}

export type PaymentDirection = "COLLECTION" | "PAYMENT";

export interface RecordPaymentInput {
  tenantId: string;
  companyId: string;
  contactId: string;
  direction: PaymentDirection; // COLLECTION = tahsilat, PAYMENT = tediye
  amount: Prisma.Decimal.Value;
  date: Date;
  /** cash (100) or bank (102) */
  via: "CASH" | "BANK";
  description?: string | null;
}

/**
 * Records a collection (tahsilat) or payment (tediye) against a contact and
 * posts the balanced journal entry atomically.
 */
export async function recordPayment(input: RecordPaymentInput) {
  const amount = round(input.amount);
  if (amount.lte(0)) throw new AppError("Tutar sıfırdan büyük olmalıdır.");

  return prisma.$transaction(async (tx) => {
    const contact = await tx.contact.findFirst({
      where: { id: input.contactId, tenantId: input.tenantId },
      select: { id: true },
    });
    if (!contact) throw new NotFoundError("Cari bulunamadı.");

    const cashCode = input.via === "CASH" ? ACCOUNT_CODES.CASH : ACCOUNT_CODES.BANK;
    const counterCode =
      input.direction === "COLLECTION" ? ACCOUNT_CODES.RECEIVABLE : ACCOUNT_CODES.PAYABLE;

    const acc = await resolveAccountIdsByCode(tx, input.tenantId, input.companyId, [
      cashCode,
      counterCode,
    ]);

    const lines =
      input.direction === "COLLECTION"
        ? [
            { accountId: acc.get(cashCode)!, debit: amount },
            { accountId: acc.get(counterCode)!, contactId: input.contactId, credit: amount },
          ]
        : [
            { accountId: acc.get(counterCode)!, contactId: input.contactId, debit: amount },
            { accountId: acc.get(cashCode)!, credit: amount },
          ];

    return postJournalEntry(tx, {
      tenantId: input.tenantId,
      companyId: input.companyId,
      date: input.date,
      description:
        input.description ??
        (input.direction === "COLLECTION" ? "Tahsilat" : "Tediye/Ödeme"),
      documentType: "PAYMENT",
      lines,
    });
  });
}
