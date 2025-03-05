-- AlterTable
ALTER TABLE "BusRoute" ADD COLUMN     "routeTypeName" TEXT;

-- CreateTable
CREATE TABLE "BusStop" (
    "id" TEXT NOT NULL,
    "busRouteId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "stationName" TEXT NOT NULL,
    "stationSeq" INTEGER NOT NULL,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusStop_pkey" PRIMARY KEY ("busRouteId","stationId")
);

-- CreateIndex
CREATE INDEX "BusStop_busRouteId_idx" ON "BusStop"("busRouteId");

-- CreateIndex
CREATE INDEX "BusStop_stationId_idx" ON "BusStop"("stationId");

-- AddForeignKey
ALTER TABLE "BusStop" ADD CONSTRAINT "BusStop_busRouteId_fkey" FOREIGN KEY ("busRouteId") REFERENCES "BusRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
