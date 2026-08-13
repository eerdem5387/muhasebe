import "server-only";
import { cache } from "react";
import type { Company, TenantRole } from "@prisma/client";
import { prisma, getTenantDb, TenantDb } from "./prisma";
import { UnauthorizedError } from "./errors";
import {
  readActiveCompanyCookie,
  readActiveTenantCookie,
  readSession,
} from "./session";

export interface MembershipSummary {
  tenantId: string;
  tenantName: string;
  role: TenantRole;
}

export interface AuthContext {
  userId: string;
  email: string;
  tenantId: string;
  tenantName: string;
  role: TenantRole;
  companyId: string | null;
  company: Company | null;
  companies: Company[];
  memberships: MembershipSummary[];
  /** Tenant-scoped Prisma client. Always use this for tenant data access. */
  db: TenantDb;
}

/**
 * Resolves the full authenticated context for the current request:
 * session -> tenant membership -> active company. Cached per-request.
 * Returns null when there is no valid session or no tenant membership.
 */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const session = await readSession();
  if (!session) return null;

  const memberships = await prisma.tenantUser.findMany({
    where: { userId: session.userId },
    include: { tenant: true },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) return null;

  const membershipSummaries: MembershipSummary[] = memberships.map((m) => ({
    tenantId: m.tenantId,
    tenantName: m.tenant.name,
    role: m.role,
  }));

  const cookieTenantId = await readActiveTenantCookie();
  const activeMembership =
    memberships.find((m) => m.tenantId === cookieTenantId) ?? memberships[0];

  const db = getTenantDb(activeMembership.tenantId);

  const companies = await db.company.findMany({ orderBy: { name: "asc" } });

  const cookieCompanyId = await readActiveCompanyCookie();
  const company =
    companies.find((c) => c.id === cookieCompanyId) ?? companies[0] ?? null;

  return {
    userId: session.userId,
    email: session.email,
    tenantId: activeMembership.tenantId,
    tenantName: activeMembership.tenant.name,
    role: activeMembership.role,
    companyId: company?.id ?? null,
    company,
    companies,
    memberships: membershipSummaries,
    db,
  };
});

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw new UnauthorizedError();
  return ctx;
}

/** Requires an authenticated context that also has an active company selected. */
export async function requireCompany(): Promise<AuthContext & { companyId: string; company: Company }> {
  const ctx = await requireAuth();
  if (!ctx.companyId || !ctx.company) {
    throw new UnauthorizedError("Önce bir şirket oluşturun ve seçin.");
  }
  return ctx as AuthContext & { companyId: string; company: Company };
}

const ROLE_RANK: Record<TenantRole, number> = {
  SALES: 1,
  ACCOUNTANT: 2,
  ADMIN: 3,
};

export function hasRole(ctx: AuthContext, min: TenantRole): boolean {
  return ROLE_RANK[ctx.role] >= ROLE_RANK[min];
}
