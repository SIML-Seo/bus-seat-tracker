-- Enable Row Level Security on all tables
-- Prisma uses direct PostgreSQL connection (DATABASE_URL) which bypasses RLS.
-- This blocks unauthorized access via Supabase PostgREST API.

ALTER TABLE "BusRoute" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BusStop" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BusLocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BusStopSeats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;

-- Bus data is public information: allow read-only access via PostgREST
CREATE POLICY "public_read" ON "BusRoute" FOR SELECT USING (true);
CREATE POLICY "public_read" ON "BusStop" FOR SELECT USING (true);
CREATE POLICY "public_read" ON "BusLocation" FOR SELECT USING (true);
CREATE POLICY "public_read" ON "BusStopSeats" FOR SELECT USING (true);

-- Contact table: no read policy = not accessible via PostgREST
