/**
 * Vercel Postgres / Neon often injects POSTGRES_URL (or POSTGRES_PRISMA_URL)
 * instead of DATABASE_URL. Prisma's schema requires DATABASE_URL (+ DIRECT_URL),
 * so alias them before the client is constructed.
 */
const POOLED_ALIASES = [
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "NEON_DATABASE_URL",
] as const;

const DIRECT_ALIASES = [
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_URL",
  "NEON_DATABASE_URL",
] as const;

if (!process.env.DATABASE_URL?.trim()) {
  for (const key of POOLED_ALIASES) {
    const value = process.env[key]?.trim();
    if (value) {
      process.env.DATABASE_URL = value;
      break;
    }
  }
}

if (!process.env.DIRECT_URL?.trim()) {
  for (const key of DIRECT_ALIASES) {
    const value = process.env[key]?.trim();
    if (value) {
      process.env.DIRECT_URL = value;
      break;
    }
  }
}

if (!process.env.DIRECT_URL?.trim() && process.env.DATABASE_URL?.trim()) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}
