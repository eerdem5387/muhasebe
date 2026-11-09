-- CreateTable
CREATE TABLE IF NOT EXISTS "BankAccountSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccountSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BankAccountSetting_tenantId_idx" ON "BankAccountSetting"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BankAccountSetting_tenantId_name_key" ON "BankAccountSetting"("tenantId", "name");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BankAccountSetting_tenantId_fkey'
  ) THEN
    ALTER TABLE "BankAccountSetting"
      ADD CONSTRAINT "BankAccountSetting_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
