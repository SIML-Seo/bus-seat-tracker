import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dedupeRouteStationsByStationId } from './routeStationDedup';

test('deduplicates route stations by stationId and keeps the earliest sequence', () => {
  const stops = [
    { stationId: 200, stationName: 'Second', stationSeq: 20, x: 1, y: 1 },
    { stationId: 100, stationName: 'First', stationSeq: 10, x: 2, y: 2 },
    { stationId: 200, stationName: 'Second again', stationSeq: 30, x: 3, y: 3 },
  ];

  assert.deepEqual(dedupeRouteStationsByStationId(stops), [
    { stationId: 100, stationName: 'First', stationSeq: 10, x: 2, y: 2 },
    { stationId: 200, stationName: 'Second', stationSeq: 20, x: 1, y: 1 },
  ]);
});

test('handles numeric and string stationIds as the same station', () => {
  const stops = [
    { stationId: '300', stationName: 'Later', stationSeq: 30 },
    { stationId: 300, stationName: 'Earlier', stationSeq: 3 },
  ];

  assert.deepEqual(dedupeRouteStationsByStationId(stops), [
    { stationId: 300, stationName: 'Earlier', stationSeq: 3 },
  ]);
});
