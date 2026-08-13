/**
 * Vercel Postgres / Neon often injects POSTGRES_URL (or POSTGRES_PRISMA_URL)
 * instead of DATABASE_URL. Prisma's schema requires DATABASE_URL, so alias it
 * before the client is constructed.
 */
const ALIASES = [
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "NEON_DATABASE_URL",
] as const;

if (!process.env.DATABASE_URL?.trim()) {
  for (const key of ALIASES) {
    const value = process.env[key]?.trim();
    if (value) {
      process.env.DATABASE_URL = value;
      break;
    }
  }
}
