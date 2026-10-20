/**
 * Retries `prisma migrate deploy` on transient Neon lock / cold-start timeouts.
 * Uses the direct (non-pooling) URL so Postgres advisory locks work.
 */
import { spawnSync } from "node:child_process";

const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 4000;

function sleep(ms) {
  const seconds = String(Math.max(1, Math.ceil(ms / 1000)));
  if (process.platform === "win32") {
    spawnSync("timeout", ["/T", seconds, "/NOBREAK"], { stdio: "ignore", shell: true });
  } else {
    spawnSync("sleep", [seconds], { stdio: "ignore" });
  }
}

const directUrl =
  process.env.DIRECT_URL?.trim() ||
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.POSTGRES_URL_NON_POOLING?.trim() ||
  process.env.DATABASE_URL?.trim();

if (!directUrl) {
  console.error("Migrate için DATABASE_URL / DIRECT_URL bulunamadı.");
  process.exit(1);
}

const migrateEnv = {
  ...process.env,
  DATABASE_URL: directUrl,
};

try {
  const host = new URL(directUrl).host;
  console.log(`Migrate bağlantısı: ${host}`);
} catch {
  console.log("Migrate bağlantısı hazır.");
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  console.log(`prisma migrate deploy (${attempt}/${MAX_ATTEMPTS})…`);
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: migrateEnv,
  });

  if (result.status === 0) {
    process.exit(0);
  }

  if (attempt >= MAX_ATTEMPTS) {
    process.exit(result.status ?? 1);
  }

  const delay = BASE_DELAY_MS * attempt;
  console.warn(`Migrate başarısız (exit ${result.status}). ${delay}ms sonra tekrar…`);
  sleep(delay);
}
