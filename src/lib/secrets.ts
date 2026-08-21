/**
 * Resolve AUTH_SECRET for JWT signing.
 * Production refuses to start with a missing or known-insecure secret.
 */
export function resolveAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  const insecure = !secret || secret === "change-me-to-a-long-random-secret-string-at-least-32-chars";

  if (process.env.NODE_ENV === "production") {
    if (insecure || (secret && secret.length < 32)) {
      throw new Error(
        "AUTH_SECRET production'da zorunlu ve en az 32 karakter olmalı. Vercel Environment Variables'a ekleyin.",
      );
    }
    return secret!;
  }

  if (insecure) {
    return "insecure-dev-secret-please-override-in-env";
  }
  return secret!;
}
