import { Prisma, type ReportPayKind, type ReportSide } from "@prisma/client";

export const MOCK_NOTE = "[mock]";

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

export function entryCaption(itemName: string, notes: string | null) {
  if (!notes || notes === MOCK_NOTE) return itemName;
  return `${itemName} · ${notes}`;
}

export async function seedMonthlyMock(
  db: {
    reportGroup: any;
    reportItem: any;
    reportEntry: any;
  },
  tenantId: string,
  yearMonth: string,
) {
  await db.reportEntry.deleteMany({
    where: { tenantId, notes: MOCK_NOTE, yearMonth },
  });

  for (const group of GROUPS) {
    const savedGroup =
      (await db.reportGroup.findFirst({
        where: { tenantId, side: group.side, name: { equals: group.name, mode: "insensitive" } },
      })) ??
      (await db.reportGroup.create({
        data: {
          tenantId,
          side: group.side,
          name: group.name,
          sortOrder: group.sortOrder,
        },
      }));

    if (savedGroup.sortOrder !== group.sortOrder || savedGroup.name !== group.name) {
      await db.reportGroup.update({
        where: { id: savedGroup.id },
        data: { name: group.name, sortOrder: group.sortOrder },
      });
    }

    for (let i = 0; i < group.entries.length; i++) {
      const row = group.entries[i];
      const existing = await db.reportItem.findFirst({
        where: { groupId: savedGroup.id, name: { equals: row.item, mode: "insensitive" } },
      });
      const item = existing
        ? await db.reportItem.update({ where: { id: existing.id }, data: { sortOrder: i } })
        : await db.reportItem.create({
            data: { tenantId, groupId: savedGroup.id, name: row.item, sortOrder: i },
          });

      const [year, month] = yearMonth.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const day = String(Math.min(row.day, lastDay)).padStart(2, "0");
      await db.reportEntry.create({
        data: {
          tenantId,
          itemId: item.id,
          yearMonth,
          amount: new Prisma.Decimal(row.amount.toFixed(2)),
          occurredAt: new Date(`${yearMonth}-${day}T12:00:00`),
          payKind: row.payKind ?? "CASH",
          notes: MOCK_NOTE,
        },
      });
    }
  }
}
