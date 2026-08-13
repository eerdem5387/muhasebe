"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import {
  clearSession,
  setActiveCompany,
  setActiveTenant,
  setSessionCookie,
} from "@/lib/session";
import { createCompany } from "@/server/companies";
import { loginSchema, registerSchema } from "@/lib/validation";
import { getAuthContext } from "@/lib/context";
import { toErrorMessage } from "@/lib/errors";
import type { ActionState } from "./types";

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  }
  const { tenantName, companyName, email, password } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { error: "Bu e-posta ile bir hesap zaten var." };

    const { user, tenantId } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash: await hashPassword(password) },
      });
      const tenant = await tx.tenant.create({
        data: { name: tenantName, subscriptionPlan: "FREE", status: "ACTIVE" },
      });
      await tx.tenantUser.create({
        data: { tenantId: tenant.id, userId: user.id, role: "ADMIN" },
      });
      return { user, tenantId: tenant.id };
    });

    const company = await createCompany({ tenantId, name: companyName });

    await setSessionCookie({ userId: user.id, email: user.email });
    await setActiveTenant(tenantId);
    await setActiveCompany(company.id);
  } catch (err) {
    return { error: toErrorMessage(err) };
  }

  redirect("/");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  }
  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return { error: "E-posta veya şifre hatalı." };
    }
    await setSessionCookie({ userId: user.id, email: user.email });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }

  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/login");
}

export async function switchTenantAction(formData: FormData): Promise<void> {
  const tenantId = String(formData.get("tenantId") ?? "");
  const ctx = await getAuthContext();
  if (ctx && ctx.memberships.some((m) => m.tenantId === tenantId)) {
    await setActiveTenant(tenantId);
  }
  redirect("/");
}

export async function switchCompanyAction(formData: FormData): Promise<void> {
  const companyId = String(formData.get("companyId") ?? "");
  const ctx = await getAuthContext();
  if (ctx && ctx.companies.some((c) => c.id === companyId)) {
    await setActiveCompany(companyId);
  }
  const back = String(formData.get("next") ?? "/");
  redirect(back);
}
