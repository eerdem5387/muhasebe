-- Otomatik oluşan plan/taksit satırlarını temizle; öğrenci ve kayıt (enrollment) kalsın.
-- Aylık tablo yalnızca elle oluşturulan Gelir planı satırlarından beslenecek.

DELETE FROM "Attachment" WHERE "collectionId" IS NOT NULL;
DELETE FROM "Collection";
DELETE FROM "IncomeScheduleLine";
DELETE FROM "IncomePlanLine";
DELETE FROM "IncomePlan";
