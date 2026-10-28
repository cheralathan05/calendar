-- Enable Row Level Security on every application table.
--
-- Context: this app uses Prisma with a direct PostgreSQL connection
-- (service_role / postgres superuser) which BYPASSES RLS by design.
-- RLS is enabled here solely to block unauthorized access through
-- Supabase's public REST API (anon / authenticated roles), which is
-- enabled by default on every Supabase project.
--
-- Security model:
--   - Prisma (service_role)  → bypasses RLS → full access ✓
--   - Supabase REST API (anon) → subject to RLS → DENY ALL (no policies) ✓
--
-- No explicit POLICY is added because the desired behavior for the
-- Supabase REST API is "deny everything". PostgreSQL denies all rows
-- by default when RLS is enabled and no policy grants access.

ALTER TABLE "User"                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Calendar"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventAttendee"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventRecurrenceException" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invitation"               ENABLE ROW LEVEL SECURITY;
