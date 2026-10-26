-- AlterTable
ALTER TABLE "ExpenseRequest" ADD COLUMN IF NOT EXISTS "founderApprovedByName" TEXT;
ALTER TABLE "ExpenseRequest" ADD COLUMN IF NOT EXISTS "rejectedByName" TEXT;
