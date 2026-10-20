/**
 * Maps Vercel/Neon Postgres env vars onto DATABASE_URL (+ DIRECT_URL) and
 * writes a .env file so prisma CLI / Next.js both see them during the build.
 *
 * Neon: prefer the non-pooling URL for build-time DATABASE_URL so
 * `prisma migrate deploy` can use Postgres advisory locks. Runtime still
 * prefers pooled URLs via process.env (see src/lib/ensure-db-url.ts).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

function firstEnv(keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return { key, value };
  }
  return null;
}

function isPoolerUrl(url) {
  try {
    return /pooler/i.test(new URL(url).hostname);
  } catch {
    return /pooler/i.test(url);
  }
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

const pooledUrl = pooled?.value ?? direct.value;
let directUrl = direct?.value ?? pooledUrl;

// If "direct" still looks pooled, keep searching aliases for a non-pooler host.
if (isPoolerUrl(directUrl)) {
  const better = firstEnv([
    "DIRECT_URL",
    "DATABASE_URL_UNPOOLED",
    "POSTGRES_URL_NON_POOLING",
    "DATABASE_URL",
    "POSTGRES_URL",
    "NEON_DATABASE_URL",
  ]);
  if (better && !isPoolerUrl(better.value)) {
    directUrl = better.value;
  }
}

/** Build-time Prisma CLI reads .env and overwrites process.env — use direct URL here. */
const buildDatabaseUrl = isPoolerUrl(directUrl) && !isPoolerUrl(pooledUrl) ? pooledUrl : directUrl;

process.env.DATABASE_URL = buildDatabaseUrl;
process.env.DIRECT_URL = directUrl;

function upsertEnvFile(vars) {
  let content = existsSync(".env") ? readFileSync(".env", "utf8") : "";
  for (const [key, value] of Object.entries(vars)) {
    const line = `${key}="${value}"`;
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(content)) {
      content = content.replace(re, line);
    } else {
      content = content ? `${content.trimEnd()}\n${line}\n` : `${line}\n`;
    }
  }
  writeFileSync(".env", content.endsWith("\n") ? content : `${content}\n`);
}

upsertEnvFile({ DATABASE_URL: buildDatabaseUrl, DIRECT_URL: directUrl });

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return "(parse-error)";
  }
}

console.log(
  `DATABASE_URL hazır (build → ${hostOf(buildDatabaseUrl)}${isPoolerUrl(buildDatabaseUrl) ? " [pooler]" : ""}).` +
    ` DIRECT_URL (${direct?.key ?? pooled?.key ?? "fallback"} → ${hostOf(directUrl)}${isPoolerUrl(directUrl) ? " [pooler]" : ""}).`,
);

if (isPoolerUrl(buildDatabaseUrl)) {
  console.warn(
    "Uyarı: Build DATABASE_URL hâlâ pooler görünüyor. Neon’da POSTGRES_URL_NON_POOLING / DATABASE_URL_UNPOOLED tanımlayın.",
  );
}
