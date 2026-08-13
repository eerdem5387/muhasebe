-- =============================================================================
-- Optional Row Level Security (RLS) hardening layer.
--
-- This is the database-enforced half of the defense-in-depth tenant isolation
-- strategy. The application already scopes every query through the Prisma
-- tenant extension (src/lib/prisma.ts); enabling RLS adds a second guard so a
-- bug in application code cannot leak data across tenants.
--
-- HOW IT WORKS
--   Each policy compares the row's "tenantId" to the session GUC
--   `app.current_tenant`. Your app must run:
--       SET app.current_tenant = '<tenantId>';
--   (or `SET LOCAL ...` inside a transaction) on the connection before issuing
--   tenant-scoped queries.
--
-- APPLY
--   1. Run migrations first:      npx prisma migrate deploy
--   2. Then apply this file:       psql "$DATABASE_URL" -f prisma/rls.sql
--
-- NOTE: FORCE ROW LEVEL SECURITY makes the policy apply even to the table
-- owner. Only enable it once your runtime reliably sets app.current_tenant,
-- otherwise unscoped maintenance queries (e.g. seeding) will see no rows.
-- =============================================================================

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'Company', 'TenantUser', 'Contact', 'Product', 'Tax',
    'Account', 'FinancialPeriod', 'LedgerEntry', 'LedgerLine',
    'Invoice', 'InvoiceLine', 'IntercompanyTransfer'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    -- EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t); -- enable in production
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      USING ("tenantId" = current_setting('app.current_tenant', true))
      WITH CHECK ("tenantId" = current_setting('app.current_tenant', true));
    $f$, t);
  END LOOP;
END $$;
