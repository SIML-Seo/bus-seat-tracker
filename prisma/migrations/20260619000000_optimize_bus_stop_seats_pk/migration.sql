-- Reduce BusStopSeats storage by removing the unused UUID primary key.
-- The existing unique index already enforces the natural statistics grain.

ALTER TABLE "BusStopSeats" DROP CONSTRAINT IF EXISTS "BusStopSeats_pkey";

ALTER TABLE "BusStopSeats"
  ADD CONSTRAINT "BusStopSeats_pkey"
  PRIMARY KEY USING INDEX "BusStopSeats_busRouteId_stopId_dayOfWeek_hourOfDay_key";

ALTER TABLE "BusStopSeats" DROP COLUMN "id";

DROP INDEX IF EXISTS "BusStopSeats_busRouteId_idx";
