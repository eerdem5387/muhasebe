import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/auth";
import { buildIncomeSchedule, scheduleStatus } from "@/server/income-schedule";

const prisma = new PrismaClient();
const PASSWORD = "123456";

async function upsertUser(email: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await hashPassword(PASSWORD);
  if (existing) {
    return prisma.user.update({ where: { id: existing.id }, data: { name, passwordHash } });
  }
  return prisma.user.create({ data: { email, name, passwordHash } });
}

async function main() {
  const tenant =
    (await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } })) ??
    (await prisma.tenant.create({ data: { name: "Demo Okul" } }));

  const users = [
    { email: "demo@muhasebe.test", name: "Okul Yöneticisi", role: "ADMIN" as const },
    { email: "muhasebe@okul.test", name: "Ayşe Muhasebe", role: "ACCOUNTANT" as const },
    { email: "mudur@okul.test", name: "Mehmet Müdür", role: "PRINCIPAL" as const },
    { email: "kurucu@okul.test", name: "Ali Kurucu", role: "FOUNDER" as const },
  ];

  for (const u of users) {
    const user = await upsertUser(u.email, u.name);
    await prisma.tenantUser.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      update: { role: u.role },
      create: { tenantId: tenant.id, userId: user.id, role: u.role },
    });
  }

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

  console.log("Seed tamamlandı. Şifre (tümü): 123456");
  console.log("  demo@muhasebe.test  (Yönetici)");
  console.log("  muhasebe@okul.test  (Muhasebe)");
  console.log("  mudur@okul.test     (Müdür)");
  console.log("  kurucu@okul.test    (Kurucu)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
