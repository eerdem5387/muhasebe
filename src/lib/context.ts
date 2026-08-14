import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { TenantRole } from "@prisma/client";
import { prisma, getTenantDb, TenantDb } from "./prisma";
import { ForbiddenError } from "./errors";
import { readActiveTenantCookie, readSession } from "./session";

export interface AuthContext {
  userId: string;
  email: string;
  name: string;
  tenantId: string;
  tenantName: string;
  role: TenantRole;
  isSuperAdmin: boolean;
  db: TenantDb;
  memberships: { tenantId: string; tenantName: string; role: TenantRole }[];
}

export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  try {
    const session = await readSession();
    if (!session) return null;

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return null;

    const memberships = await prisma.tenantUser.findMany({
      where: { userId: session.userId },
      include: { tenant: true },
      orderBy: { createdAt: "asc" },
    });
    if (memberships.length === 0) return null;

    const cookieTenantId = await readActiveTenantCookie();
    const active = memberships.find((m) => m.tenantId === cookieTenantId) ?? memberships[0];

    return {
      userId: session.userId,
      email: user.email,
      name: user.name,
      tenantId: active.tenantId,
      tenantName: active.tenant.name,
      role: active.role,
      isSuperAdmin: user.isSuperAdmin,
      db: getTenantDb(active.tenantId),
      memberships: memberships.map((m) => ({
        tenantId: m.tenantId,
        tenantName: m.tenant.name,
        role: m.role,
      })),
    };
  } catch (err) {
    console.error("getAuthContext failed", err);
    return null;
  }
});

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/api/auth/clear");
  return ctx;
}

export function canManageOperations(role: TenantRole, isSuperAdmin = false): boolean {
  return isSuperAdmin || role === "ADMIN" || role === "ACCOUNTANT";
}

export function canApproveAsPrincipal(role: TenantRole, isSuperAdmin = false): boolean {
  return isSuperAdmin || role === "ADMIN" || role === "PRINCIPAL";
}

export function canApproveAsFounder(role: TenantRole, isSuperAdmin = false): boolean {
  return isSuperAdmin || role === "ADMIN" || role === "FOUNDER";
}

export function canManageSettings(role: TenantRole, isSuperAdmin = false): boolean {
  return isSuperAdmin || role === "ADMIN";
}

export async function requireOperations(): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!canManageOperations(ctx.role, ctx.isSuperAdmin)) {
    throw new ForbiddenError("Bu işlem için muhasebe yetkisi gerekir.");
  }
  return ctx;
}

export async function requireSettings(): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!canManageSettings(ctx.role, ctx.isSuperAdmin)) {
    throw new ForbiddenError("Bu işlem için yönetici yetkisi gerekir.");
  }
  return ctx;
}

export async function requireSuperAdmin(): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!ctx.isSuperAdmin) {
    throw new ForbiddenError("Bu işlem yalnızca süper admin içindir.");
  }
  return ctx;
}
