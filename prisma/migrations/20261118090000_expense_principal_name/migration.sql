-- Müdür onayı veren kişinin adı (çift onay kuralı)
ALTER TABLE "ExpenseRequest" ADD COLUMN IF NOT EXISTS "principalApprovedByName" TEXT;
