import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { BusStop } from './bus-detail';
import { findStopNameMatch, searchStops } from './stop-search';

const makeStop = (stationId: string, stationName: string, stationSeq: number): BusStop => ({
  busRouteId: 'route-1',
  stationId,
  stationName,
  stationSeq,
});

test('finds a plain substring', () => {
  assert.deepEqual(findStopNameMatch('사당역3번출구', '3번'), { start: 3, end: 5 });
});

test('ignores spaces, separators and letter case', () => {
  assert.deepEqual(findStopNameMatch('강남역.신분당선', '강남역 신분당'), { start: 0, end: 7 });
  assert.deepEqual(findStopNameMatch('판교IC', 'ic'), { start: 2, end: 4 });
});

test('matches Korean initial consonants, alone or mixed with syllables', () => {
  assert.deepEqual(findStopNameMatch('사당역3번출구', 'ㅅㄷㅇ'), { start: 0, end: 3 });
  assert.deepEqual(findStopNameMatch('사당역3번출구', '사ㄷ'), { start: 0, end: 2 });
  assert.deepEqual(findStopNameMatch('시흥공영차고지', 'ㅊㄱㅈ'), { start: 4, end: 7 });
});

test('returns null for empty queries and non-matches', () => {
  assert.equal(findStopNameMatch('사당역3번출구', ''), null);
  assert.equal(findStopNameMatch('사당역3번출구', '  '), null);
  assert.equal(findStopNameMatch('사당역3번출구', '강남'), null);
  assert.equal(findStopNameMatch('사당', 'ㅏ'), null);
});

test('lists matches in route order with their direction, once per direction', () => {
  const directions = [
    { label: '사당역 방면', stops: [makeStop('1', '시흥공영차고지대기', 1), makeStop('2', '대야동(경유)', 2), makeStop('3', '사당역', 3)] },
    { label: '시흥 방면', stops: [makeStop('2', '대야동', 4), makeStop('4', '은계중', 5)] },
  ];

  const results = searchStops(directions, '대야');

  assert.deepEqual(
    results.map(result => [result.stopKey, result.directionLabel, result.match]),
    [
      ['2-2', '사당역 방면', { start: 0, end: 2 }],
      ['2-4', '시흥 방면', { start: 0, end: 2 }],
    ]
  );
});

test('does not match the (경유) style tag', () => {
  const directions = [{ label: 'A 방면', stops: [makeStop('1', '신천고가교차로(경유)', 1)] }];

  assert.deepEqual(searchStops(directions, '경유'), []);
});
