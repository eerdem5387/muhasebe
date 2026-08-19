import { Prisma, PrismaClient, type ReportPayKind, type ReportSide } from "@prisma/client";

const prisma = new PrismaClient();
const MOCK_NOTE = "[mock]";
const YEAR_MONTH = "2026-08";

type EntrySeed = {
  item: string;
  amount: number;
  day: number;
  payKind?: ReportPayKind;
};

type GroupSeed = {
  side: ReportSide;
  name: string;
  sortOrder: number;
  entries: EntrySeed[];
};

const GROUPS: GroupSeed[] = [
  {
    side: "INCOME",
    name: "Öğrenci gelirleri",
    sortOrder: 0,
    entries: [{ item: "Nakit / kasa geliri", amount: 47660, day: 31 }],
  },
  {
    side: "INCOME",
    name: "Kredi kartları / POS",
    sortOrder: 1,
    entries: [
      { item: "İş Bankası", amount: 74094, day: 31 },
      { item: "Akbank", amount: 35087.12, day: 31 },
      { item: "Yapı Kredi", amount: 34370, day: 31 },
      { item: "Garanti Bankası", amount: 39415.31, day: 31 },
    ],
  },
  {
    side: "INCOME",
    name: "EFT",
    sortOrder: 2,
    entries: [{ item: "İş Bankası kurumsal", amount: 492051.16, day: 31 }],
  },
  {
    side: "INCOME",
    name: "OTS",
    sortOrder: 3,
    entries: [
      { item: "İş Bankası", amount: 52750, day: 31 },
      { item: "Akbank", amount: 21390, day: 31 },
      { item: "Yapı Kredi", amount: 66753.75, day: 31 },
    ],
  },
  {
    side: "INCOME",
    name: "Diğer finansal gelirler",
    sortOrder: 4,
    entries: [
      { item: "Emin Usta", amount: 50000, day: 15 },
      { item: "Abdulkadir Erdem", amount: 10000, day: 20 },
      { item: "Yemekhane ücretleri", amount: 10970, day: 28 },
      { item: "Kitap ücretleri", amount: 3900, day: 28 },
      { item: "Tales matematik sınav girişi", amount: 1350, day: 10 },
    ],
  },
  {
    side: "EXPENSE",
    name: "Sabit giderler",
    sortOrder: 0,
    entries: [
      { item: "Toplu maaşlar", amount: 312233, day: 5 },
      { item: "Elden ödenen maaş", amount: 8500, day: 5 },
      { item: "Elektrik", amount: 24823, day: 12 },
      { item: "İnternet", amount: 496, day: 12 },
      { item: "Telefon", amount: 330, day: 12 },
      { item: "Doğalgaz", amount: 26711.61, day: 12 },
    ],
  },
  {
    side: "EXPENSE",
    name: "Sarf",
    sortOrder: 1,
    entries: [
      { item: "Temizlik malzemeleri", amount: 15000, day: 8 },
      { item: "Personel servis aracı mazot", amount: 4310, day: 18, payKind: "CARD" },
    ],
  },
  {
    side: "EXPENSE",
    name: "Devlet ödemeleri",
    sortOrder: 2,
    entries: [{ item: "SGK", amount: 66230.74, day: 25 }],
  },
  {
    side: "EXPENSE",
    name: "Kira",
    sortOrder: 3,
    entries: [{ item: "Okul kirası", amount: 14000, day: 3 }],
  },
  {
    side: "EXPENSE",
    name: "Kurucu",
    sortOrder: 4,
    entries: [{ item: "A. Erdem borç verilen", amount: 230000, day: 7 }],
  },
  {
    side: "EXPENSE",
    name: "Diğer giderler",
    sortOrder: 5,
    entries: [
      { item: "2029705 nolu çek ödemesi", amount: 18775, day: 31 },
      { item: "Kredi kartı borç ödeme", amount: 48568.82, day: 10 },
      { item: "Ahmet Doğru Aralık ders ücreti", amount: 6240, day: 4 },
      { item: "Okul interneti icra masrafları", amount: 4188, day: 3, payKind: "CARD" },
      { item: "3 TV kurulumu", amount: 2100, day: 3 },
      { item: "Personel servis aracı akü", amount: 1900, day: 6, payKind: "CARD" },
      { item: "Reklam ücreti", amount: 7500, day: 9 },
      { item: "Çiçek ücretleri", amount: 2000, day: 10 },
      { item: "Instagram reklam ücreti", amount: 1500, day: 17 },
      { item: "Mobilya ücreti", amount: 16000, day: 31 },
      { item: "Santral sistem kurulumu", amount: 7862, day: 31 },
    ],
  },
];

async function upsertItem(tenantId: string, groupId: string, name: string, sortOrder: number) {
  const existing = await prisma.reportItem.findFirst({
    where: { groupId, name: { equals: name, mode: "insensitive" } },
  });
  if (existing) {
    return prisma.reportItem.update({
      where: { id: existing.id },
      data: { sortOrder },
    });
  }
  return prisma.reportItem.create({
    data: { tenantId, groupId, name, sortOrder },
  });
}

async function main() {
  const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  if (!tenant) {
    throw new Error("Tenant yok. Önce `npm run db:seed` çalıştırın.");
  }

  await prisma.reportEntry.deleteMany({
    where: { tenantId: tenant.id, notes: MOCK_NOTE },
  });

  for (const group of GROUPS) {
    const savedGroup =
      (await prisma.reportGroup.findFirst({
        where: { tenantId: tenant.id, side: group.side, name: { equals: group.name, mode: "insensitive" } },
      })) ??
      (await prisma.reportGroup.create({
        data: {
          tenantId: tenant.id,
          side: group.side,
          name: group.name,
          sortOrder: group.sortOrder,
        },
      }));

    if (savedGroup.sortOrder !== group.sortOrder || savedGroup.name !== group.name) {
      await prisma.reportGroup.update({
        where: { id: savedGroup.id },
        data: { name: group.name, sortOrder: group.sortOrder },
      });
    }

    for (let i = 0; i < group.entries.length; i++) {
      const row = group.entries[i];
      const item = await upsertItem(tenant.id, savedGroup.id, row.item, i);
      const day = String(row.day).padStart(2, "0");
      await prisma.reportEntry.create({
        data: {
          tenantId: tenant.id,
          itemId: item.id,
          yearMonth: YEAR_MONTH,
          amount: new Prisma.Decimal(row.amount.toFixed(2)),
          occurredAt: new Date(`${YEAR_MONTH}-${day}T12:00:00`),
          payKind: row.payKind ?? "CASH",
          notes: MOCK_NOTE,
        },
      });
    }
  }

  console.log(`Aylık mock veri yüklendi (${YEAR_MONTH}). Kalem notu: ${MOCK_NOTE}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
