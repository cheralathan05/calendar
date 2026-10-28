-- Mirrors 20260603000000_enable_rls_all_tables: Prisma's direct connection
-- (service_role) bypasses RLS by design. RLS is enabled here solely to
-- deny access through Supabase's public REST API (anon/authenticated
-- roles). No POLICY is added, so all access through that API is denied.

ALTER TABLE "EventReminderDelivery" ENABLE ROW LEVEL SECURITY;
