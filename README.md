# Okul Muhasebe

Tek okul için sade nakit takibi: yıllık kayıt ücreti, tahsilat belgeleri, kredi kartı bloke/taksit gelir planı, gider kalemleri ve müdür+kurucu onaylı harcama talepleri.

## Teknoloji

- Next.js (App Router) + React + TypeScript
- Prisma + PostgreSQL
- JWT cookie oturumu, Zod doğrulama

## Roller

| Rol | Yetki |
| --- | --- |
| Muhasebe (`ACCOUNTANT`) | Öğrenci, tahsilat, gider, talep oluşturma |
| Müdür (`PRINCIPAL`) | Harcama talebi onayı / red |
| Kurucu (`FOUNDER`) | Harcama talebi onayı / red |
| Yönetici (`ADMIN`) | Kullanıcı, banka KK ayarları, kalemler + tüm işlemler |

Harcama talebi **müdür ve kurucu** onaylamadan (sıra önemli değil) gider kaydına bağlanamaz.

## Kredi kartı gelir planı

Ayarlar → banka adı + bloke süresi (gün). Kayıt ücreti bu bankada N taksit olursa:

```
taksit = yıllık ücret / N
serbest kalma = kayıt tarihi + (taksitIndex * 30 gün) + bloke günü
```

Aylık gelir tablosu o ay blokeli / beklenen / gerçekleşen tutarı gösterir.

Tahsilatta belge zorunlu: KK → slip, çek → fotoğraf, EFT/nakit → makbuz.

## Kurulum

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Demo giriş (şifre hepsi `123456`):

- `demo@muhasebe.test` — Yönetici
- `muhasebe@okul.test` — Muhasebe
- `mudur@okul.test` — Müdür
- `kurucu@okul.test` — Kurucu
