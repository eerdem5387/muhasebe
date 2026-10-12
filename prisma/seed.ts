import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/auth";
import { buildIncomeSchedule, scheduleStatus } from "@/server/income-schedule";

const prisma = new PrismaClient();
const PASSWORD = "123456";
const LEVENT_MUHASEBE_PASSWORD = "LeventMuh2026!";

async function upsertUser(email: string, name: string, isSuperAdmin = false, password = PASSWORD) {
  const existing = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await hashPassword(password);
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { name, passwordHash, isSuperAdmin },
    });
  }
  return prisma.user.create({ data: { email, name, passwordHash, isSuperAdmin } });
}

async function main() {
  const tenant =
    (await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } })) ??
    (await prisma.tenant.create({ data: { name: "Demo Okul" } }));

  const users = [
    { email: "superadmin@okul.test", name: "Süper Admin", role: "ADMIN" as const, isSuperAdmin: true },
    { email: "demo@muhasebe.test", name: "Okul Yöneticisi", role: "ADMIN" as const, isSuperAdmin: true },
    { email: "muhasebe@okul.test", name: "Ayşe Muhasebe", role: "ACCOUNTANT" as const, isSuperAdmin: false },
    {
      email: "muhasebe@leventokullari.com",
      name: "Levent Muhasebe",
      role: "ACCOUNTANT" as const,
      isSuperAdmin: false,
    },
    { email: "mudur@okul.test", name: "Mehmet Müdür", role: "PRINCIPAL" as const, isSuperAdmin: false },
    { email: "kurucu@okul.test", name: "Ali Kurucu", role: "FOUNDER" as const, isSuperAdmin: false },
  ];

  for (const u of users) {
    const password =
      u.email === "muhasebe@leventokullari.com" ? LEVENT_MUHASEBE_PASSWORD : PASSWORD;
    const user = await upsertUser(u.email, u.name, u.isSuperAdmin, password);
    await prisma.tenantUser.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      update: { role: u.role },
      create: { tenantId: tenant.id, userId: user.id, role: u.role },
    });
  }

  // Varsayılan gelir planı kalemleri
  await prisma.incomePlanCategory.createMany({
    data: [
      { tenantId: tenant.id, name: "Öğrenci geliri", requiresStudent: true },
      { tenantId: tenant.id, name: "Kitap geliri", requiresStudent: false },
      { tenantId: tenant.id, name: "Araç servis geliri", requiresStudent: false },
    ],
    skipDuplicates: true,
  });

  const ziraat = await prisma.cardBankSetting.upsert({
    where: { id: "seed-ziraat" },
    update: { bankName: "Ziraat Bankası", blockDays: 30, active: true, tenantId: tenant.id },
    create: { id: "seed-ziraat", tenantId: tenant.id, bankName: "Ziraat Bankası", blockDays: 30 },
  }).catch(async () => {
    const existing = await prisma.cardBankSetting.findFirst({
      where: { tenantId: tenant.id, bankName: "Ziraat Bankası" },
    });
    if (existing) return existing;
    return prisma.cardBankSetting.create({
      data: { tenantId: tenant.id, bankName: "Ziraat Bankası", blockDays: 30 },
    });
  });

  await prisma.ledgerCategory.createMany({
    data: [
      { tenantId: tenant.id, type: "EXPENSE", name: "Kırtasiye" },
      { tenantId: tenant.id, type: "EXPENSE", name: "Temizlik" },
      { tenantId: tenant.id, type: "EXPENSE", name: "Yemek" },
      { tenantId: tenant.id, type: "INCOME", name: "Kayıt ücreti" },
    ],
    skipDuplicates: true,
  });

  let student = await prisma.student.findFirst({ where: { tenantId: tenant.id, fullName: "Elif Yılmaz" } });
  if (!student) {
    student = await prisma.student.create({
      data: { tenantId: tenant.id, fullName: "Elif Yılmaz", classroom: "3-A", parentPhone: "0532 000 00 00" },
    });
  }

  const hasEnrollment = await prisma.enrollment.findFirst({ where: { studentId: student.id } });
  if (!hasEnrollment) {
    const enrolledAt = new Date();
    const drafts = buildIncomeSchedule({
      annualFee: 100000,
      installmentCount: 10,
      paymentDate: enrolledAt,
      blockDays: ziraat.blockDays,
    });
    await prisma.enrollment.create({
      data: {
        tenantId: tenant.id,
        studentId: student.id,
        academicYear: `${enrolledAt.getFullYear()}-${enrolledAt.getFullYear() + 1}`,
        annualFee: 100000,
        paymentChannel: "CREDIT_CARD",
        installmentCount: 10,
        cardBankId: ziraat.id,
        enrolledAt,
        scheduleLines: {
          create: drafts.map((line) => ({
            tenantId: tenant.id,
            installmentIndex: line.installmentIndex,
            amount: line.amount,
            releaseDate: line.releaseDate,
            yearMonth: line.yearMonth,
            status: scheduleStatus(line.releaseDate, false),
          })),
        },
      },
    });
  }

  console.log("Seed tamamlandı.");
  console.log("  superadmin@okul.test / 123456 (Süper Admin)");
  console.log("  demo@muhasebe.test / 123456 (Süper Admin + Yönetici)");
  console.log("  muhasebe@okul.test / 123456 (Muhasebe)");
  console.log(`  muhasebe@leventokullari.com / ${LEVENT_MUHASEBE_PASSWORD} (Muhasebe, kısıtlı)`);
  console.log("  mudur@okul.test / 123456 (Müdür)");
  console.log("  kurucu@okul.test / 123456 (Kurucu)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
