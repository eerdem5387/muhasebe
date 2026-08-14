"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { clearSession, setActiveTenant, setSessionCookie } from "@/lib/session";
import { loginSchema, userSchema } from "@/lib/validation";
import { getAuthContext, requireSettings } from "@/lib/context";
import { toErrorMessage } from "@/lib/errors";
import type { ActionState } from "./types";

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return { error: "E-posta veya şifre hatalı." };
    }
    const membership = await prisma.tenantUser.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    if (!membership) {
      return { error: "Bu hesabın okul erişimi yok. Yönetici ile iletişime geçin." };
    }
    await setSessionCookie({ userId: user.id, email: user.email });
    await setActiveTenant(membership.tenantId);
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/login");
}

export async function createUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = userSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri." };

  try {
    const ctx = await requireSettings();
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return { error: "Bu e-posta ile bir hesap zaten var." };

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
      },
    });
    await prisma.tenantUser.create({
      data: { tenantId: ctx.tenantId, userId: user.id, role: parsed.data.role },
    });
  } catch (err) {
    return { error: toErrorMessage(err) };
  }
  revalidatePath("/settings");
  return { success: "Kullanıcı eklendi." };
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const ctx = await requireSettings();
  const id = String(formData.get("id") ?? "");
  if (!id || id === ctx.userId) return;
  await prisma.tenantUser.deleteMany({ where: { tenantId: ctx.tenantId, userId: id } });
  revalidatePath("/settings");
}

export async function switchTenantAction(formData: FormData): Promise<void> {
  const tenantId = String(formData.get("tenantId") ?? "");
  const ctx = await getAuthContext();
  if (ctx && tenantId) await setActiveTenant(tenantId);
  redirect("/");
}
