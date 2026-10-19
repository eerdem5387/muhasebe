/**
 * Production/local: demo süper admin + muhasebe@leventokullari.com hesabını garanti eder.
 * Usage: npx tsx scripts/ensure-users.ts
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient();
const LEVENT_PASSWORD = "LeventMuh2026!";
const DEMO_PASSWORD = "123456";

async function upsertUser(
  email: string,
  name: string,
  isSuperAdmin: boolean,
  password: string,
) {
  const passwordHash = await hashPassword(password);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { name, passwordHash, isSuperAdmin },
    });
  }
  return prisma.user.create({ data: { email, name, passwordHash, isSuperAdmin } });
}

async function main() {
  let tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  if (!tenant) {
    tenant = await prisma.tenant.create({ data: { name: "Levent Koleji" } });
  } else if (tenant.name === "Demo Okul" || !tenant.name.trim()) {
    tenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: { name: "Levent Koleji" },
    });
  }

  const demo = await upsertUser("demo@muhasebe.test", "Okul Yöneticisi", true, DEMO_PASSWORD);
  await prisma.tenantUser.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: demo.id } },
    update: { role: "ADMIN" },
    create: { tenantId: tenant.id, userId: demo.id, role: "ADMIN" },
  });

  const muhasebe = await upsertUser(
    "muhasebe@leventokullari.com",
    "Levent Muhasebe",
    false,
    LEVENT_PASSWORD,
  );
  await prisma.tenantUser.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: muhasebe.id } },
    update: { role: "ACCOUNTANT" },
    create: { tenantId: tenant.id, userId: muhasebe.id, role: "ACCOUNTANT" },
  });

  await prisma.incomePlanCategory.createMany({
    data: [
      { tenantId: tenant.id, name: "Öğrenci geliri", requiresStudent: true },
      { tenantId: tenant.id, name: "Kitap geliri", requiresStudent: false },
      { tenantId: tenant.id, name: "Araç servis geliri", requiresStudent: false },
    ],
    skipDuplicates: true,
  });

  console.log("OK — demo@muhasebe.test (süper admin), muhasebe@leventokullari.com (muhasebe)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
