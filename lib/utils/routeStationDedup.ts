export interface RouteStationLike {
  stationId: string | number;
  stationName: string;
  stationSeq: number;
  x?: number | null;
  y?: number | null;
}

export function dedupeRouteStationsByStationId<T extends RouteStationLike>(stops: readonly T[]): T[] {
  const byStationId = new Map<string, T>();

  for (const stop of stops) {
    const stationId = String(stop.stationId);
    const existing = byStationId.get(stationId);

    if (!existing || stop.stationSeq < existing.stationSeq) {
      byStationId.set(stationId, stop);
    }
  }

  return [...byStationId.values()].sort((a, b) => a.stationSeq - b.stationSeq);
}
