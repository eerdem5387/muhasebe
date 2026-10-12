/**
 * Shared secret for muhasebe ↔ okul-yonetim service calls.
 * Prefer INTEGRATION_SECRET; falls back to CRON_SECRET for single-secret setups.
 */
export function resolveIntegrationSecret(): string | null {
  const secret =
    process.env.INTEGRATION_SECRET?.trim() ||
    process.env.SCHOOL_INTEGRATION_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "";
  return secret || null;
}

export function authorizeIntegrationRequest(req: Request): boolean {
  const secret = resolveIntegrationSecret();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const serviceHeader = req.headers.get("x-service-secret")?.trim() ?? "";
  return bearer === secret || serviceHeader === secret;
}
