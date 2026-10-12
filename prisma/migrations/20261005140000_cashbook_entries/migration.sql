-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CashbookIncomeCategory" AS ENUM ('STUDENT', 'TRIP', 'FOOD', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CashbookChannel" AS ENUM ('CASH', 'CREDIT_CARD', 'CHECK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "CashbookEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "side" "ReportSide" NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "channel" "CashbookChannel" NOT NULL,
    "bankName" TEXT,
    "checkInstallments" INTEGER,
    "incomeCategory" "CashbookIncomeCategory",
    "payerFirstName" TEXT,
    "payerLastName" TEXT,
    "payerIdentityNo" TEXT,
    "expenseTitle" TEXT,
    "payeeIdentityNo" TEXT,
    "invoiceNo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashbookEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CashbookEntry_tenantId_yearMonth_side_idx" ON "CashbookEntry"("tenantId", "yearMonth", "side");
CREATE INDEX IF NOT EXISTS "CashbookEntry_tenantId_yearMonth_idx" ON "CashbookEntry"("tenantId", "yearMonth");

DO $$ BEGIN
  ALTER TABLE "CashbookEntry" ADD CONSTRAINT "CashbookEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
