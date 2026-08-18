-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "RegistrationStatus" AS ENUM ('NEW', 'RENEWED', 'NOT_RENEWED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentProgress" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'NOT_RENEWED';

ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "paymentProgress" "PaymentProgress" NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "paymentProgressManual" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "IncomeScheduleLine" ADD COLUMN IF NOT EXISTS "plannedChannel" "PaymentChannel";
