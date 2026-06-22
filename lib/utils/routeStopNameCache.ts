export interface RouteStopName {
  busRouteId: string;
  stationId: string;
  stationName: string;
}

interface RouteStopNameCacheOptions {
  ttlMs: number;
  now?: () => number;
  loadStops: (routeIds: string[]) => Promise<RouteStopName[]>;
  refreshRouteStops?: (routeId: string) => Promise<RouteStopName[]>;
}

interface RouteStopNameCacheEntry {
  loadedAt: number;
  routeIdsKey: string;
  stopMap: Map<string, string>;
}

function createStopKey(busRouteId: string, stationId: string): string {
  return `${busRouteId}_${stationId}`;
}

function createRouteIdsKey(routeIds: string[]): string {
  return [...new Set(routeIds)].sort().join('|');
}

export function createRouteStopNameCache(options: RouteStopNameCacheOptions) {
  const now = options.now ?? Date.now;
  const entries = new Map<string, RouteStopNameCacheEntry>();
  const routeRefreshes = new Map<string, Promise<RouteStopName[]>>();

  async function getStopMap(routeIds: string[]): Promise<Map<string, string>> {
    const routeIdsKey = createRouteIdsKey(routeIds);
    const cached = entries.get(routeIdsKey);

    if (cached && now() - cached.loadedAt < options.ttlMs) {
      return cached.stopMap;
    }

    const stops = await options.loadStops([...new Set(routeIds)]);
    const stopMap = new Map<string, string>();

    for (const stop of stops) {
      stopMap.set(createStopKey(stop.busRouteId, stop.stationId), stop.stationName);
    }

    entries.set(routeIdsKey, {
      loadedAt: now(),
      routeIdsKey,
      stopMap,
    });

    return stopMap;
  }

  async function resolveMissingStop(
    stopMap: Map<string, string>,
    routeId: string,
    stopId: string
  ): Promise<string> {
    if (!options.refreshRouteStops) {
      return '';
    }

    let refreshPromise = routeRefreshes.get(routeId);

    if (!refreshPromise) {
      refreshPromise = options.refreshRouteStops(routeId).finally(() => {
        routeRefreshes.delete(routeId);
      });
      routeRefreshes.set(routeId, refreshPromise);
    }

    const refreshedStops = await refreshPromise;
    for (const stop of refreshedStops) {
      const key = createStopKey(stop.busRouteId, stop.stationId);
      stopMap.set(key, stop.stationName);

      for (const entry of entries.values()) {
        entry.stopMap.set(key, stop.stationName);
      }
    }

    return stopMap.get(createStopKey(routeId, stopId)) || '';
  }

  function invalidateAll(): void {
    entries.clear();
  }

  return {
    getStopMap,
    resolveMissingStop,
    invalidateAll,
  };
}
