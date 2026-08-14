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
  db: TenantDb;
}

export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const session = await readSession();
  if (!session) return null;

  const memberships = await prisma.tenantUser.findMany({
    where: { userId: session.userId },
    include: { tenant: true, user: true },
    orderBy: { createdAt: "asc" },
  });
  if (memberships.length === 0) return null;

  const cookieTenantId = await readActiveTenantCookie();
  const active = memberships.find((m) => m.tenantId === cookieTenantId) ?? memberships[0];

  return {
    userId: session.userId,
    email: active.user.email,
    name: active.user.name,
    tenantId: active.tenantId,
    tenantName: active.tenant.name,
    role: active.role,
    db: getTenantDb(active.tenantId),
  };
});

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  // Redirect instead of throw — thrown errors become opaque production digests
  // when the page RSC runs in parallel with the layout.
  if (!ctx) redirect("/api/auth/clear");
  return ctx;
}

export function canManageOperations(role: TenantRole): boolean {
  return role === "ADMIN" || role === "ACCOUNTANT";
}

export function canApproveAsPrincipal(role: TenantRole): boolean {
  return role === "ADMIN" || role === "PRINCIPAL";
}

export function canApproveAsFounder(role: TenantRole): boolean {
  return role === "ADMIN" || role === "FOUNDER";
}

export function canManageSettings(role: TenantRole): boolean {
  return role === "ADMIN";
}

export async function requireOperations(): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!canManageOperations(ctx.role)) {
    throw new ForbiddenError("Bu işlem için muhasebe yetkisi gerekir.");
  }
  return ctx;
}

export async function requireSettings(): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!canManageSettings(ctx.role)) {
    throw new ForbiddenError("Bu işlem için yönetici yetkisi gerekir.");
  }
  return ctx;
}
