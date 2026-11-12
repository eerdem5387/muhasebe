-- CreateTable
CREATE TABLE IF NOT EXISTS "ExpenseCardSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCardSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExpenseCardSetting_tenantId_idx" ON "ExpenseCardSetting"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ExpenseCardSetting_tenantId_name_key" ON "ExpenseCardSetting"("tenantId", "name");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ExpenseCardSetting_tenantId_fkey'
  ) THEN
    ALTER TABLE "ExpenseCardSetting"
      ADD CONSTRAINT "ExpenseCardSetting_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AlterTable
ALTER TABLE "ExpenseRequest" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
