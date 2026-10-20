/**
 * Runs `prisma migrate deploy` for Vercel/Neon builds.
 *
 * Prisma CLI loads `.env` and overwrites process.env — so we rewrite
 * DATABASE_URL in `.env` to the direct (non-pooling) URL before migrate.
 *
 * If a previous crashed migrate left a stuck advisory lock (P1002), we retry
 * with PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1 (safe here: single prod DB,
 * migrations are sequential via git; concurrent deploys still race without
 * the lock, but a stuck lock blocks all deploys indefinitely).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 3000;

function sleep(ms) {
  const seconds = String(Math.max(1, Math.ceil(ms / 1000)));
  spawnSync("sleep", [seconds], { stdio: "ignore" });
}

function isPoolerUrl(url) {
  try {
    return /pooler/i.test(new URL(url).hostname);
  } catch {
    return /pooler/i.test(url);
  }
}

function upsertEnvVar(key, value) {
  let content = existsSync(".env") ? readFileSync(".env", "utf8") : "";
  const line = `${key}="${value}"`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(content)) content = content.replace(re, line);
  else content = content ? `${content.trimEnd()}\n${line}\n` : `${line}\n`;
  writeFileSync(".env", content.endsWith("\n") ? content : `${content}\n`);
}

const candidates = [
  process.env.DIRECT_URL,
  process.env.DATABASE_URL_UNPOOLED,
  process.env.POSTGRES_URL_NON_POOLING,
  process.env.DATABASE_URL,
  process.env.POSTGRES_URL,
  process.env.NEON_DATABASE_URL,
]
  .map((v) => v?.trim())
  .filter(Boolean);

const directUrl =
  candidates.find((u) => !isPoolerUrl(u)) ?? candidates[0] ?? null;

if (!directUrl) {
  console.error("Migrate için DATABASE_URL / DIRECT_URL bulunamadı.");
  process.exit(1);
}

upsertEnvVar("DATABASE_URL", directUrl);
upsertEnvVar("DIRECT_URL", directUrl);
process.env.DATABASE_URL = directUrl;
process.env.DIRECT_URL = directUrl;

try {
  const host = new URL(directUrl).host;
  console.log(`Migrate bağlantısı: ${host}${isPoolerUrl(directUrl) ? " [pooler]" : " [direct]"}`);
} catch {
  console.log("Migrate bağlantısı hazır.");
}

function runMigrate({ disableAdvisoryLock }) {
  const env = {
    ...process.env,
    DATABASE_URL: directUrl,
    DIRECT_URL: directUrl,
  };
  if (disableAdvisoryLock) {
    env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = "1";
  }
  return spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env,
  });
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  console.log(`prisma migrate deploy (${attempt}/${MAX_ATTEMPTS})…`);
  const result = runMigrate({ disableAdvisoryLock: false });
  if (result.status === 0) process.exit(0);

  if (attempt < MAX_ATTEMPTS) {
    const delay = BASE_DELAY_MS * attempt;
    console.warn(`Migrate başarısız (exit ${result.status}). ${delay}ms sonra tekrar…`);
    sleep(delay);
  }
}

console.warn(
  "Advisory lock alınamadı — PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1 ile son deneme…",
);
const unlocked = runMigrate({ disableAdvisoryLock: true });
process.exit(unlocked.status ?? 1);
