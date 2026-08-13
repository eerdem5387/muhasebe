import "server-only";
import { cookies } from "next/headers";
import {
  ACTIVE_COMPANY_COOKIE,
  ACTIVE_TENANT_COOKIE,
  SESSION_COOKIE,
  SessionPayload,
  createSessionToken,
  sessionMaxAge,
  verifySessionToken,
} from "./auth";

const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    ...baseCookieOptions,
    maxAge: sessionMaxAge(),
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(ACTIVE_TENANT_COOKIE);
  store.delete(ACTIVE_COMPANY_COOKIE);
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setActiveTenant(tenantId: string): Promise<void> {
  const store = await cookies();
  store.set(ACTIVE_TENANT_COOKIE, tenantId, {
    ...baseCookieOptions,
    maxAge: sessionMaxAge(),
  });
  // Company selection is tenant-specific; clear it when tenant changes.
  store.delete(ACTIVE_COMPANY_COOKIE);
}

export async function setActiveCompany(companyId: string): Promise<void> {
  const store = await cookies();
  store.set(ACTIVE_COMPANY_COOKIE, companyId, {
    ...baseCookieOptions,
    maxAge: sessionMaxAge(),
  });
}

export async function readActiveTenantCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACTIVE_TENANT_COOKIE)?.value;
}

export async function readActiveCompanyCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACTIVE_COMPANY_COOKIE)?.value;
}
