import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createRouteStopNameCache } from './routeStopNameCache';

test('loads stop names once within the TTL', async () => {
  let loadCount = 0;
  const cache = createRouteStopNameCache({
    ttlMs: 1_000,
    now: () => 1_000,
    loadStops: async () => {
      loadCount++;
      return [
        { busRouteId: 'route-1', stationId: 'stop-1', stationName: 'Station 1' },
      ];
    },
  });

  const first = await cache.getStopMap(['route-1']);
  const second = await cache.getStopMap(['route-1']);

  assert.equal(first.get('route-1_stop-1'), 'Station 1');
  assert.equal(second.get('route-1_stop-1'), 'Station 1');
  assert.equal(loadCount, 1);
});

test('reloads stop names after the TTL expires', async () => {
  let now = 1_000;
  let loadCount = 0;
  const cache = createRouteStopNameCache({
    ttlMs: 1_000,
    now: () => now,
    loadStops: async () => {
      loadCount++;
      return [
        { busRouteId: 'route-1', stationId: 'stop-1', stationName: `Station ${loadCount}` },
      ];
    },
  });

  assert.equal((await cache.getStopMap(['route-1'])).get('route-1_stop-1'), 'Station 1');

  now = 2_001;

  assert.equal((await cache.getStopMap(['route-1'])).get('route-1_stop-1'), 'Station 2');
  assert.equal(loadCount, 2);
});

test('invalidates cache explicitly after route refresh', async () => {
  let loadCount = 0;
  const cache = createRouteStopNameCache({
    ttlMs: 60_000,
    now: () => 1_000,
    loadStops: async () => {
      loadCount++;
      return [
        { busRouteId: 'route-1', stationId: 'stop-1', stationName: `Station ${loadCount}` },
      ];
    },
  });

  assert.equal((await cache.getStopMap(['route-1'])).get('route-1_stop-1'), 'Station 1');

  cache.invalidateAll();

  assert.equal((await cache.getStopMap(['route-1'])).get('route-1_stop-1'), 'Station 2');
  assert.equal(loadCount, 2);
});

test('refreshes a single route when a missing stop is discovered', async () => {
  let routeRefreshCount = 0;
  const cache = createRouteStopNameCache({
    ttlMs: 60_000,
    now: () => 1_000,
    loadStops: async () => [
      { busRouteId: 'route-1', stationId: 'stop-1', stationName: 'Station 1' },
    ],
    refreshRouteStops: async (routeId) => {
      routeRefreshCount++;
      return [
        { busRouteId: routeId, stationId: 'stop-2', stationName: 'Station 2' },
      ];
    },
  });

  const map = await cache.getStopMap(['route-1']);
  const stopName = await cache.resolveMissingStop(map, 'route-1', 'stop-2');

  assert.equal(stopName, 'Station 2');
  assert.equal(map.get('route-1_stop-2'), 'Station 2');
  assert.equal(routeRefreshCount, 1);
});

test('deduplicates concurrent refreshes for the same missing route', async () => {
  let routeRefreshCount = 0;
  let resolveRefresh!: () => void;
  const refreshStarted = new Promise<void>((resolve) => {
    resolveRefresh = resolve;
  });
  const cache = createRouteStopNameCache({
    ttlMs: 60_000,
    now: () => 1_000,
    loadStops: async () => [],
    refreshRouteStops: async (routeId) => {
      routeRefreshCount++;
      await refreshStarted;
      return [
        { busRouteId: routeId, stationId: 'stop-2', stationName: 'Station 2' },
      ];
    },
  });

  const map = await cache.getStopMap(['route-1']);
  const first = cache.resolveMissingStop(map, 'route-1', 'stop-2');
  const second = cache.resolveMissingStop(map, 'route-1', 'stop-2');

  resolveRefresh();

  assert.deepEqual(await Promise.all([first, second]), ['Station 2', 'Station 2']);
  assert.equal(routeRefreshCount, 1);
});
