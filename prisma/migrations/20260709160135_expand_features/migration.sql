-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EInvoiceProfile" AS ENUM ('NONE', 'EARSIV', 'EFATURA');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('NOTE', 'CALL', 'MEETING', 'EMAIL', 'TASK');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'EXPENSE';
ALTER TYPE "DocumentType" ADD VALUE 'INCOME';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "taxNumber" TEXT,
ADD COLUMN     "taxOffice" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "einvoiceProfile" "EInvoiceProfile" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "ettn" TEXT,
ADD COLUMN     "netTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
ADD COLUMN     "taxTotal" DECIMAL(18,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "InvoiceLine" ADD COLUMN     "description" TEXT,
ADD COLUMN     "netAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN     "taxAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN     "taxRate" DECIMAL(18,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN     "reversalOfId" TEXT;

-- CreateTable
CREATE TABLE "ContactActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL DEFAULT 'NOTE',
    "subject" TEXT NOT NULL,
    "notes" TEXT,
    "dueDate" TIMESTAMP(3),
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactActivity_tenantId_idx" ON "ContactActivity"("tenantId");

-- CreateIndex
CREATE INDEX "ContactActivity_contactId_idx" ON "ContactActivity"("contactId");

-- CreateIndex
CREATE INDEX "Invoice_companyId_issueDate_idx" ON "Invoice"("companyId", "issueDate");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_reversalOfId_key" ON "LedgerEntry"("reversalOfId");

-- AddForeignKey
ALTER TABLE "ContactActivity" ADD CONSTRAINT "ContactActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactActivity" ADD CONSTRAINT "ContactActivity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

