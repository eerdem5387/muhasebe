import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/auth";
import { ACCOUNT_CODES } from "@/lib/chart-of-accounts";
import { createCompany } from "@/server/companies";
import { createInvoiceWithPosting, recordPayment } from "@/server/accounting/engine";
import { createIntercompanyTransfer } from "@/server/accounting/intercompany";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@muhasebe.test";
const DEMO_PASSWORD = "Demo1234!";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    console.log(`Demo kullanıcısı (${DEMO_EMAIL}) zaten mevcut. Seed atlanıyor.`);
    return;
  }

  const user = await prisma.user.create({
    data: { email: DEMO_EMAIL, passwordHash: await hashPassword(DEMO_PASSWORD) },
  });

  const tenant = await prisma.tenant.create({
    data: { name: "Demo Grup A.Ş.", subscriptionPlan: "PRO", status: "ACTIVE" },
  });

  await prisma.tenantUser.create({
    data: { tenantId: tenant.id, userId: user.id, role: "ADMIN" },
  });

  const companyA = await createCompany({ tenantId: tenant.id, name: "Anadolu Ticaret A.Ş.", taxNumber: "1234567890", taxOffice: "Kadıköy" });
  const companyB = await createCompany({ tenantId: tenant.id, name: "Ege Lojistik Ltd. Şti.", taxNumber: "9876543210", taxOffice: "Konak" });

  await prisma.company.update({
    where: { id: companyA.id },
    data: { address: "Bağdat Cad. No:120", city: "İstanbul", phone: "0216 000 00 00", email: "info@anadoluticaret.test", iban: "TR00 0001 0000 0000 0000 0000 01" },
  });
  await prisma.company.update({
    where: { id: companyB.id },
    data: { address: "Alsancak Mah. 1453 Sk. No:5", city: "İzmir", phone: "0232 000 00 00", email: "info@egelojistik.test", iban: "TR00 0001 0000 0000 0000 0000 02" },
  });

  const kdv20 = await prisma.tax.create({ data: { tenantId: tenant.id, name: "KDV %20", rate: 20 } });
  const kdv10 = await prisma.tax.create({ data: { tenantId: tenant.id, name: "KDV %10", rate: 10 } });
  await prisma.tax.create({ data: { tenantId: tenant.id, name: "KDV %1", rate: 1 } });

  const customer = await prisma.contact.create({
    data: { tenantId: tenant.id, name: "Yıldız Market Ltd.", type: "CUSTOMER", email: "muhasebe@yildizmarket.test", phone: "0212 111 11 11", taxNumber: "1112223334", taxOffice: "Beşiktaş", address: "Barbaros Bulvarı No:10", city: "İstanbul", crmStage: "WON" },
  });
  const vendor = await prisma.contact.create({
    data: { tenantId: tenant.id, name: "Berk Toptan Gıda", type: "VENDOR", email: "info@berktoptan.test", phone: "0312 222 22 22", taxNumber: "5556667778", taxOffice: "Çankaya", address: "Atatürk Blv. No:200", city: "Ankara", crmStage: "WON" },
  });
  await prisma.contact.create({
    data: { tenantId: tenant.id, name: "Deniz Yazılım A.Ş.", type: "LEAD", email: "satis@denizyazilim.test", crmStage: "PROPOSAL" },
  });

  const consulting = await prisma.product.create({
    data: { tenantId: tenant.id, name: "Danışmanlık Hizmeti", type: "SERVICE", unit: "saat", defaultPrice: 1000 },
  });
  const paper = await prisma.product.create({
    data: { tenantId: tenant.id, name: "A4 Fotokopi Kağıdı", type: "PRODUCT", unit: "koli", defaultPrice: 150 },
  });

  // Sales invoice (company A -> customer), KDV exclusive.
  await createInvoiceWithPosting({
    tenantId: tenant.id,
    companyId: companyA.id,
    type: "SALES",
    contactId: customer.id,
    invoiceNumber: "SAT-2026-0001",
    issueDate: new Date("2026-01-15"),
    priceMode: "EXCLUSIVE",
    lines: [
      { productId: consulting.id, quantity: 10, unitPrice: 1000, taxId: kdv20.id },
      { productId: paper.id, quantity: 20, unitPrice: 150, taxId: kdv10.id },
    ],
  });

  // Purchase invoice (company A <- vendor).
  await createInvoiceWithPosting({
    tenantId: tenant.id,
    companyId: companyA.id,
    type: "PURCHASE",
    contactId: vendor.id,
    invoiceNumber: "ALIS-2026-0001",
    issueDate: new Date("2026-01-20"),
    priceMode: "EXCLUSIVE",
    lines: [{ productId: paper.id, quantity: 100, unitPrice: 120, taxId: kdv20.id }],
  });

  // Collection from customer (tahsilat) into the bank.
  await recordPayment({
    tenantId: tenant.id,
    companyId: companyA.id,
    contactId: customer.id,
    direction: "COLLECTION",
    amount: 5000,
    date: new Date("2026-01-25"),
    via: "BANK",
    description: "Yıldız Market kısmi tahsilat",
  });

  // Intercompany transfer: company A funds company B.
  const bankA = await prisma.account.findFirstOrThrow({
    where: { tenantId: tenant.id, companyId: companyA.id, code: ACCOUNT_CODES.BANK },
  });
  const bankB = await prisma.account.findFirstOrThrow({
    where: { tenantId: tenant.id, companyId: companyB.id, code: ACCOUNT_CODES.BANK },
  });
  await createIntercompanyTransfer({
    tenantId: tenant.id,
    fromCompanyId: companyA.id,
    toCompanyId: companyB.id,
    fromAccountId: bankA.id,
    toAccountId: bankB.id,
    amount: 25000,
    date: new Date("2026-02-01"),
    description: "Grup içi nakit desteği",
  });

  console.log("Seed tamamlandı.");
  console.log(`  Giriş: ${DEMO_EMAIL}  Şifre: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
