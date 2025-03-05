-- CreateTable
CREATE TABLE "BusRoute" (
    "id" TEXT NOT NULL,
    "routeName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startStopName" TEXT NOT NULL,
    "endStopName" TEXT NOT NULL,
    "company" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusLocation" (
    "id" TEXT NOT NULL,
    "busRouteId" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "stopId" TEXT,
    "stopName" TEXT,
    "remainingSeats" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusStopSeats" (
    "id" TEXT NOT NULL,
    "busRouteId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "stopName" TEXT NOT NULL,
    "averageSeats" DOUBLE PRECISION NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "hourOfDay" INTEGER NOT NULL,
    "samplesCount" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusStopSeats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusLocation_busRouteId_idx" ON "BusLocation"("busRouteId");

-- CreateIndex
CREATE INDEX "BusLocation_updatedAt_idx" ON "BusLocation"("updatedAt");

-- CreateIndex
CREATE INDEX "BusStopSeats_busRouteId_idx" ON "BusStopSeats"("busRouteId");

-- CreateIndex
CREATE INDEX "BusStopSeats_stopId_idx" ON "BusStopSeats"("stopId");

-- CreateIndex
CREATE UNIQUE INDEX "BusStopSeats_busRouteId_stopId_dayOfWeek_hourOfDay_key" ON "BusStopSeats"("busRouteId", "stopId", "dayOfWeek", "hourOfDay");

-- AddForeignKey
ALTER TABLE "BusLocation" ADD CONSTRAINT "BusLocation_busRouteId_fkey" FOREIGN KEY ("busRouteId") REFERENCES "BusRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusStopSeats" ADD CONSTRAINT "BusStopSeats_busRouteId_fkey" FOREIGN KEY ("busRouteId") REFERENCES "BusRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
