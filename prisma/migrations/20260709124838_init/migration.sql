-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('ADMIN', 'ACCOUNTANT', 'SALES');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('CUSTOMER', 'VENDOR', 'LEAD');

-- CreateEnum
CREATE TYPE "CrmStage" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('SALES', 'PURCHASE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('INVOICE', 'PAYMENT', 'TRANSFER', 'MANUAL', 'OPENING');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantUser" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL DEFAULT 'SALES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxNumber" TEXT,
    "taxOffice" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "email" TEXT,
    "crmStage" "CrmStage" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProductType" NOT NULL DEFAULT 'PRODUCT',
    "unit" TEXT NOT NULL DEFAULT 'adet',
    "defaultPrice" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tax" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialPeriod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "documentType" "DocumentType" NOT NULL DEFAULT 'MANUAL',
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ledgerEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "contactId" TEXT,
    "debit" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "grandTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "taxId" TEXT,
    "lineTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntercompanyTransfer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromCompanyId" TEXT NOT NULL,
    "toCompanyId" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntercompanyTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "TenantUser_tenantId_idx" ON "TenantUser"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantUser_tenantId_userId_key" ON "TenantUser"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "Company_tenantId_idx" ON "Company"("tenantId");

-- CreateIndex
CREATE INDEX "Contact_tenantId_idx" ON "Contact"("tenantId");

-- CreateIndex
CREATE INDEX "Contact_tenantId_type_idx" ON "Contact"("tenantId", "type");

-- CreateIndex
CREATE INDEX "Product_tenantId_idx" ON "Product"("tenantId");

-- CreateIndex
CREATE INDEX "Tax_tenantId_idx" ON "Tax"("tenantId");

-- CreateIndex
CREATE INDEX "Account_tenantId_companyId_idx" ON "Account"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_companyId_code_key" ON "Account"("companyId", "code");

-- CreateIndex
CREATE INDEX "FinancialPeriod_tenantId_companyId_idx" ON "FinancialPeriod"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "LedgerEntry_tenantId_companyId_idx" ON "LedgerEntry"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "LedgerEntry_companyId_date_idx" ON "LedgerEntry"("companyId", "date");

-- CreateIndex
CREATE INDEX "LedgerEntry_documentType_documentId_idx" ON "LedgerEntry"("documentType", "documentId");

-- CreateIndex
CREATE INDEX "LedgerLine_tenantId_idx" ON "LedgerLine"("tenantId");

-- CreateIndex
CREATE INDEX "LedgerLine_accountId_idx" ON "LedgerLine"("accountId");

-- CreateIndex
CREATE INDEX "LedgerLine_contactId_idx" ON "LedgerLine"("contactId");

-- CreateIndex
CREATE INDEX "LedgerLine_ledgerEntryId_idx" ON "LedgerLine"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_companyId_idx" ON "Invoice"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_companyId_type_invoiceNumber_key" ON "Invoice"("companyId", "type", "invoiceNumber");

-- CreateIndex
CREATE INDEX "InvoiceLine_tenantId_idx" ON "InvoiceLine"("tenantId");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "IntercompanyTransfer_tenantId_idx" ON "IntercompanyTransfer"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantUser" ADD CONSTRAINT "TenantUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantUser" ADD CONSTRAINT "TenantUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tax" ADD CONSTRAINT "Tax_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialPeriod" ADD CONSTRAINT "FinancialPeriod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialPeriod" ADD CONSTRAINT "FinancialPeriod_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerLine" ADD CONSTRAINT "LedgerLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerLine" ADD CONSTRAINT "LedgerLine_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerLine" ADD CONSTRAINT "LedgerLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerLine" ADD CONSTRAINT "LedgerLine_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_taxId_fkey" FOREIGN KEY ("taxId") REFERENCES "Tax"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntercompanyTransfer" ADD CONSTRAINT "IntercompanyTransfer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntercompanyTransfer" ADD CONSTRAINT "IntercompanyTransfer_fromCompanyId_fkey" FOREIGN KEY ("fromCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntercompanyTransfer" ADD CONSTRAINT "IntercompanyTransfer_toCompanyId_fkey" FOREIGN KEY ("toCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntercompanyTransfer" ADD CONSTRAINT "IntercompanyTransfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntercompanyTransfer" ADD CONSTRAINT "IntercompanyTransfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
