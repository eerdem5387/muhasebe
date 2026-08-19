-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ReportSide" AS ENUM ('INCOME', 'EXPENSE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReportPayKind" AS ENUM ('CASH', 'CARD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ReportGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "side" "ReportSide" NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReportGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReportItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReportItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReportEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "payKind" "ReportPayKind" NOT NULL DEFAULT 'CASH',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReportEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReportGroup_tenantId_side_name_key" ON "ReportGroup"("tenantId", "side", "name");
CREATE INDEX IF NOT EXISTS "ReportGroup_tenantId_side_idx" ON "ReportGroup"("tenantId", "side");
CREATE UNIQUE INDEX IF NOT EXISTS "ReportItem_groupId_name_key" ON "ReportItem"("groupId", "name");
CREATE INDEX IF NOT EXISTS "ReportItem_tenantId_idx" ON "ReportItem"("tenantId");
CREATE INDEX IF NOT EXISTS "ReportEntry_tenantId_yearMonth_idx" ON "ReportEntry"("tenantId", "yearMonth");
CREATE INDEX IF NOT EXISTS "ReportEntry_itemId_idx" ON "ReportEntry"("itemId");

DO $$ BEGIN
  ALTER TABLE "ReportGroup" ADD CONSTRAINT "ReportGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ReportItem" ADD CONSTRAINT "ReportItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ReportItem" ADD CONSTRAINT "ReportItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ReportGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ReportEntry" ADD CONSTRAINT "ReportEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ReportEntry" ADD CONSTRAINT "ReportEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ReportItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
