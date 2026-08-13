-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "businessCenter" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'Türkiye',
ADD COLUMN     "district" TEXT,
ADD COLUMN     "mersisNo" TEXT,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "tradeRegistryNo" TEXT;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "country" TEXT DEFAULT 'Türkiye',
ADD COLUMN     "district" TEXT,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "tckn" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "discountTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN     "dispatchType" TEXT NOT NULL DEFAULT 'ELEKTRONIK';

-- AlterTable
ALTER TABLE "InvoiceLine" ADD COLUMN     "discountAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN     "discountRate" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'Adet';

