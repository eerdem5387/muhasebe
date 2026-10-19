ALTER TABLE "ExpenseRequest" ALTER COLUMN "total" DROP NOT NULL;

ALTER TABLE "ExpenseRequest" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "ExpenseRequest" ADD COLUMN IF NOT EXISTS "completedById" TEXT;

ALTER TABLE "ExpenseRequest" DROP COLUMN IF EXISTS "quantity";
ALTER TABLE "ExpenseRequest" DROP COLUMN IF EXISTS "unitPrice";

UPDATE "ExpenseRequest" SET "channel" = 'BANK' WHERE "channel"::text = 'TRANSFER';
UPDATE "Expense" SET "channel" = 'BANK' WHERE "channel"::text = 'TRANSFER';
