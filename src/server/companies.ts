import { prisma } from "@/lib/prisma";
import { DEFAULT_CHART_OF_ACCOUNTS } from "@/lib/chart-of-accounts";

export interface CompanyProfile {
  taxNumber?: string | null;
  taxOffice?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  district?: string | null;
  city?: string | null;
  country?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  iban?: string | null;
  tradeRegistryNo?: string | null;
  mersisNo?: string | null;
  businessCenter?: string | null;
}

export interface CreateCompanyInput extends CompanyProfile {
  tenantId: string;
  name: string;
}

/** Normalises empty strings to null for optional profile fields. */
export function companyProfileData(p: CompanyProfile) {
  return {
    taxNumber: p.taxNumber || null,
    taxOffice: p.taxOffice || null,
    address: p.address || null,
    neighborhood: p.neighborhood || null,
    district: p.district || null,
    city: p.city || null,
    country: p.country || "Türkiye",
    postalCode: p.postalCode || null,
    phone: p.phone || null,
    email: p.email || null,
    iban: p.iban || null,
    tradeRegistryNo: p.tradeRegistryNo || null,
    mersisNo: p.mersisNo || null,
    businessCenter: p.businessCenter || null,
  };
}

/**
 * Creates a company and provisions its default chart of accounts plus the
 * current-year financial period, atomically.
 */
export async function createCompany(input: CreateCompanyInput) {
  return prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        ...companyProfileData(input),
      },
    });

    await tx.account.createMany({
      data: DEFAULT_CHART_OF_ACCOUNTS.map((a) => ({
        tenantId: input.tenantId,
        companyId: company.id,
        code: a.code,
        name: a.name,
        type: a.type,
      })),
    });

    const now = new Date();
    await tx.financialPeriod.create({
      data: {
        tenantId: input.tenantId,
        companyId: company.id,
        startDate: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
        endDate: new Date(Date.UTC(now.getUTCFullYear(), 11, 31)),
        isClosed: false,
      },
    });

    return company;
  });
}
