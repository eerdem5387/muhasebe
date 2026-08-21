import "server-only";
import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };

const globalStore = globalThis as unknown as {
  __loginRateLimit?: Map<string, Bucket>;
};

const store = globalStore.__loginRateLimit ?? new Map<string, Bucket>();
globalStore.__loginRateLimit = store;

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function keyFrom(email: string, ip: string) {
  return `${ip}|${email.trim().toLowerCase()}`;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}

/** Returns remaining lock seconds if blocked, otherwise null. */
export function checkLoginRateLimit(email: string, ip: string): number | null {
  const key = keyFrom(email, ip);
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket) return null;
  if (now >= bucket.resetAt) {
    store.delete(key);
    return null;
  }
  if (bucket.count >= MAX_ATTEMPTS) {
    return Math.ceil((bucket.resetAt - now) / 1000);
  }
  return null;
}

export function recordLoginFailure(email: string, ip: string): void {
  const key = keyFrom(email, ip);
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  bucket.count += 1;
}

export function clearLoginRateLimit(email: string, ip: string): void {
  store.delete(keyFrom(email, ip));
}
