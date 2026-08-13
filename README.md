# Muhasebe SaaS — Ön Muhasebe + T-Cetveli (Double-Entry) + CRM

Çok kiracılı (multi-tenant) ve çok şirketli (multi-company / grup şirketleri) bir ön
muhasebe, çift taraflı kayıt (double-entry / T-cetveli) ve CRM platformu.

## Teknoloji

- **Next.js (App Router) + React + TypeScript** — full-stack (Server Actions).
- **TailwindCSS** — arayüz.
- **Prisma + PostgreSQL** — veritabanı ve ORM.
- **jose (JWT) + bcryptjs** — kimlik doğrulama (httpOnly cookie oturumu).
- **Zod** — girdi doğrulama.
- **ExcelJS** — `.xlsx` dışa aktarım.

## Özellikler

- **Faturalar**: satış/alış faturası, kalem bazında net/KDV, fatura detay sayfası,
  yazdırılabilir (PDF) çıktı, durum akışı (taslak/kesildi/gönderildi/iptal).
- **E-Fatura / E-Arşiv**: UBL-TR 1.2 uyumlu XML üretimi (entegratöre hazır) ve
  e-faturaya dönüştürme + ETTN üretimi. Fatura iptalinde otomatik ters muhasebe kaydı.
- **Gelir/Gider fişleri**: kasa/banka/veresiye kanallarıyla otomatik muhasebeleşme.
- **Manuel yevmiye fişi**: dinamik satırlar, canlı borç/alacak denge kontrolü.
- **Fiş iptali (storno)**: her yevmiye fişi için ters kayıt.
- **Raporlar**: Mizan, Cari Ekstre, Defter-i Kebir (hesap ekstresi), KDV Beyanı,
  Gelir Tablosu (Kâr/Zarar), Bilanço, Cari Yaşlandırma (FIFO). Tümü Excel'e aktarılabilir.
- **CRM**: cari detay sayfası, aktivite/görev zaman çizelgesi, güncel bakiye,
  ilişkili faturalar, satış hunisi aşaması.
- **Dashboard**: son 6 ay gelir/gider grafiği, nakit pozisyonu, alacak/borç özeti.
- **Excel dışa aktarım**: tüm listeler ve raporlar için tek tıkla `.xlsx`.

### Önemli uç noktalar

- `GET /api/export/{resource}` — `.xlsx` dışa aktarım (invoices, contacts, products,
  taxes, accounts, journal, transfers, trial-balance, statement, vat,
  income-statement, balance-sheet, aging-receivable, aging-payable).
- `GET /api/invoices/{id}/ubl` — UBL-TR 1.2 fatura XML indirir.

## Mimari İlkeler

1. **Multi-tenant izolasyonu (defense-in-depth):**
   - `users` dışındaki tüm tablolarda `tenantId` bulunur.
   - Uygulama katmanı: `getTenantDb(tenantId)` Prisma extension'ı her sorguya
     otomatik `tenantId` enjekte eder (`src/lib/prisma.ts`).
   - Veritabanı katmanı (opsiyonel): `prisma/rls.sql` ile Postgres Row Level
     Security politikaları.
2. **Multi-company izolasyonu:** Hesap planı, yevmiye, fatura ve banka hareketleri
   `companyId` bazında ayrışır. Cariler (contacts) ise tenant genelinde ortaktır.
3. **Double-entry & ACID:** Tüm finansal yazımlar veritabanı transaction'ı içinde
   yapılır. `postJournalEntry` borç ≠ alacak olduğunda `UnbalancedLedgerError`
   fırlatır ve transaction geri alınır (rollback).

## Kurulum

```bash
# 1) Bağımlılıklar
npm install

# 2) PostgreSQL (Docker ile)
docker compose up -d

# 3) Ortam değişkenleri
cp .env.example .env   # gerekirse DATABASE_URL ve AUTH_SECRET güncelleyin

# 4) Şema ve migration
npx prisma migrate dev --name init

# 5) (Opsiyonel) RLS politikaları
psql "$DATABASE_URL" -f prisma/rls.sql

# 6) Demo verisi
npm run db:seed

# 7) Geliştirme sunucusu
npm run dev
```

Uygulama: http://localhost:3000

Demo giriş: **demo@muhasebe.test** / **Demo1234!**

## Vercel

Framework Preset **Next.js** olmalı. Output Directory **boş** bırakın (`public` yazmayın).

### 1. Postgres ekleyin (zorunlu)

Vercel Dashboard → **Storage → Create Database → Postgres** (veya Neon) → bu projeye bağlayın.

Bu `POSTGRES_URL` / `POSTGRES_PRISMA_URL` üretir. Uygulama bunları otomatik olarak `DATABASE_URL` olarak kullanır. İsterseniz aynı değeri `DATABASE_URL` adıyla da ekleyebilirsiniz.

### 2. Environment Variables

- `DATABASE_URL` — yoksa Storage'daki `POSTGRES_URL` yeterli
- `AUTH_SECRET` — en az 32 karakter rastgele dize (Production + Preview)

Redeploy sonrası `prisma migrate deploy` build içinde çalışır.

Demo kullanıcı için bir kez:

```bash
vercel env pull .env.production
npx prisma db seed
```

## Muhasebeleşme Kuralları

| İşlem | Borç | Alacak |
| --- | --- | --- |
| Satış faturası | 120 Alıcılar (genel toplam) | 600 Yurtiçi Satışlar (net) + 391 Hesaplanan KDV |
| Alış faturası | 153 Ticari Mallar (net) + 191 İndirilecek KDV | 320 Satıcılar (genel toplam) |
| Tahsilat | 100/102 Kasa/Banka | 120 Alıcılar |
| Ödeme (tediye) | 320 Satıcılar | 100/102 Kasa/Banka |
| Şirketler arası transfer (gönderen) | 133 Grup Şirketlerinden Alacaklar | 100/102 Banka |
| Şirketler arası transfer (alan) | 100/102 Banka | 336 Grup Şirketlerine Borçlar |

KDV, fatura kalemlerinde "KDV dahil" / "KDV hariç" seçimine göre hesaplanır.

## Proje Yapısı

```
prisma/
  schema.prisma        Veritabanı şeması (14 model)
  seed.ts              Demo veri
  rls.sql              Opsiyonel Postgres RLS politikaları
src/
  lib/                 prisma, auth, session, context, money, validation, format
  server/
    companies.ts       Şirket + varsayılan hesap planı provizyonu
    accounting/
      ledger.ts        Çift taraflı fiş (postJournalEntry) — denge kontrolü
      engine.ts        Fatura & tahsilat muhasebeleşme motoru
      intercompany.ts  Şirketler arası transfer servisi
      reports.ts       Cari ekstre + mizan sorguları
  app/
    actions/           Server actions (auth, crm, catalog, company, accounting, transfers)
    (app)/             Kimlik doğrulamalı arayüz (panel, faturalar, yevmiye, raporlar…)
    login, register    Giriş / kayıt
  components/          UI bileşenleri
  middleware.ts        Oturum tabanlı route koruması
```

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Prisma generate + production build |
| `npm run typecheck` | TypeScript tip kontrolü |
| `npm run prisma:migrate` | Migration (dev) |
| `npm run db:seed` | Demo veri yükle |
| `npm run prisma:studio` | Prisma Studio |
