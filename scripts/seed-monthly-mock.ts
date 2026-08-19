import { PrismaClient } from "@prisma/client";
import { MOCK_NOTE, seedMonthlyMock } from "../src/server/monthly-mock";

const prisma = new PrismaClient();
const YEAR_MONTH = process.argv[2] || "2026-08";

async function main() {
  const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  if (!tenant) {
    throw new Error("Tenant yok. Önce `npm run db:seed` çalıştırın.");
  }

  await seedMonthlyMock(prisma, tenant.id, YEAR_MONTH);
  console.log(`Aylık mock veri yüklendi (${tenant.name} / ${YEAR_MONTH}). Not: ${MOCK_NOTE}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
