-- Enforce optional FK for IncomePlan.enrollmentId (relation was missing in Prisma schema).
-- Orphan enrollmentId values (if any) are cleared first.

UPDATE "IncomePlan"
SET "enrollmentId" = NULL
WHERE "enrollmentId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Enrollment" e WHERE e.id = "IncomePlan"."enrollmentId"
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'IncomePlan_enrollmentId_fkey'
  ) THEN
    ALTER TABLE "IncomePlan"
      ADD CONSTRAINT "IncomePlan_enrollmentId_fkey"
      FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
