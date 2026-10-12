-- CreateTable
CREATE TABLE IF NOT EXISTS "IncomePlanCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "requiresStudent" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IncomePlanCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IncomePlanCategory_tenantId_name_key" ON "IncomePlanCategory"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "IncomePlanCategory_tenantId_idx" ON "IncomePlanCategory"("tenantId");

CREATE TABLE IF NOT EXISTS "IncomePlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "paymentChannel" "PaymentChannel" NOT NULL,
    "installmentCount" INTEGER NOT NULL DEFAULT 1,
    "blockDays" INTEGER NOT NULL DEFAULT 0,
    "bankName" TEXT,
    "planDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IncomePlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IncomePlan_tenantId_idx" ON "IncomePlan"("tenantId");
CREATE INDEX IF NOT EXISTS "IncomePlan_categoryId_idx" ON "IncomePlan"("categoryId");
CREATE INDEX IF NOT EXISTS "IncomePlan_enrollmentId_idx" ON "IncomePlan"("enrollmentId");

CREATE TABLE IF NOT EXISTS "IncomePlanLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "installmentIndex" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'EXPECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IncomePlanLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IncomePlanLine_tenantId_yearMonth_idx" ON "IncomePlanLine"("tenantId", "yearMonth");
CREATE INDEX IF NOT EXISTS "IncomePlanLine_planId_idx" ON "IncomePlanLine"("planId");

DO $$ BEGIN
  ALTER TABLE "IncomePlanCategory" ADD CONSTRAINT "IncomePlanCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "IncomePlan" ADD CONSTRAINT "IncomePlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "IncomePlan" ADD CONSTRAINT "IncomePlan_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "IncomePlanCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "IncomePlanLine" ADD CONSTRAINT "IncomePlanLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "IncomePlanLine" ADD CONSTRAINT "IncomePlanLine_planId_fkey" FOREIGN KEY ("planId") REFERENCES "IncomePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
