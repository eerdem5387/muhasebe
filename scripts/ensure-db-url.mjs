/**
 * Maps Vercel/Neon Postgres env vars onto DATABASE_URL (+ DIRECT_URL) and
 * writes a .env file so prisma migrate deploy and Next.js both see them.
 *
 * Neon: pooled URLs are fine for the app runtime, but `prisma migrate deploy`
 * needs a direct (non-pooling) connection for advisory locks.
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

function firstEnv(keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return { key, value };
  }
  return null;
}

const pooled = firstEnv([
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "NEON_DATABASE_URL",
]);

const direct = firstEnv([
  "DIRECT_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_URL",
  "NEON_DATABASE_URL",
]);

if (!pooled && !direct) {
  console.error(`
DATABASE_URL bulunamadı.

Vercel Dashboard → Storage → Create Database → Postgres (veya Neon)
ardından projeye bağlayın. Prisma "DATABASE_URL" bekler; Vercel bazen
yalnızca POSTGRES_URL yazar — bu script onu otomatik eşler.

Elle eklemek için: Settings → Environment Variables → DATABASE_URL
`);
  process.exit(1);
}

const databaseUrl = pooled?.value ?? direct.value;
/** Prefer non-pooling for migrations; fall back to pooled if that is all we have. */
const directUrl = direct?.value ?? databaseUrl;

process.env.DATABASE_URL = databaseUrl;
process.env.DIRECT_URL = directUrl;

function upsertEnvFile(vars) {
  let content = existsSync(".env") ? readFileSync(".env", "utf8") : "";
  for (const [key, value] of Object.entries(vars)) {
    const line = `${key}="${value}"\n`;
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(content)) {
      content = content.replace(re, line.trimEnd());
    } else {
      content = content ? `${content.trimEnd()}\n${line}` : line;
    }
  }
  writeFileSync(".env", content.endsWith("\n") ? content : `${content}\n`);
}

upsertEnvFile({ DATABASE_URL: databaseUrl, DIRECT_URL: directUrl });

const pooledHost = (() => {
  try {
    return new URL(databaseUrl).host;
  } catch {
    return "(parse-error)";
  }
})();
const directHost = (() => {
  try {
    return new URL(directUrl).host;
  } catch {
    return "(parse-error)";
  }
})();

console.log(
  `DATABASE_URL hazır (${pooled?.key ?? "fallback"} → ${pooledHost}).` +
    ` DIRECT_URL (${direct?.key ?? "fallback"} → ${directHost}).`,
);
