/**
 * Maps Vercel/Neon Postgres env vars onto DATABASE_URL and writes a .env file
 * so `prisma migrate deploy` and Next.js both see it during the Vercel build.
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const aliases = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "NEON_DATABASE_URL",
];

const databaseUrl = aliases.map((key) => process.env[key]?.trim()).find(Boolean);

if (!databaseUrl) {
  console.error(`
DATABASE_URL bulunamadı.

Vercel Dashboard → Storage → Create Database → Postgres (veya Neon)
ardından projeye bağlayın. Prisma "DATABASE_URL" bekler; Vercel bazen
yalnızca POSTGRES_URL yazar — bu script onu otomatik eşler.

Elle eklemek için: Settings → Environment Variables → DATABASE_URL
`);
  process.exit(1);
}

process.env.DATABASE_URL = databaseUrl;

const line = `DATABASE_URL="${databaseUrl}"\n`;
if (existsSync(".env")) {
  const current = readFileSync(".env", "utf8");
  if (!/^DATABASE_URL=/m.test(current)) {
    appendFileSync(".env", `\n${line}`);
  }
} else {
  writeFileSync(".env", line);
}

console.log("DATABASE_URL hazır.");
