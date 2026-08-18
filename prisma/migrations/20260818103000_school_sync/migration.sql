-- AlterTable
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "syncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "announcedFee" DECIMAL(18,2);
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "sourceKind" TEXT;
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "sourcePaymentPlan" TEXT;
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "contractNo" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SchoolSyncRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "ok" BOOLEAN NOT NULL DEFAULT false,
    "studentsUpserted" INTEGER NOT NULL DEFAULT 0,
    "enrollmentsUpserted" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    CONSTRAINT "SchoolSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Student_tenantId_externalId_key" ON "Student"("tenantId", "externalId");
CREATE UNIQUE INDEX IF NOT EXISTS "Enrollment_tenantId_externalId_key" ON "Enrollment"("tenantId", "externalId");
CREATE INDEX IF NOT EXISTS "SchoolSyncRun_tenantId_startedAt_idx" ON "SchoolSyncRun"("tenantId", "startedAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SchoolSyncRun_tenantId_fkey'
  ) THEN
    ALTER TABLE "SchoolSyncRun"
      ADD CONSTRAINT "SchoolSyncRun_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
