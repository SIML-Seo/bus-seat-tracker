// 버스 상세 화면의 타입, 상수, 순수 계산 함수.
// 상태/React에 의존하지 않으므로 같은 입력에 항상 같은 결과를 낸다.
// Tailwind 클래스 문자열을 반환하는 함수가 있어 tailwind content 스캔 경로(app/) 안에 둔다.

import { splitStationName } from '@/app/_shared/route-display';
import { LOW_SAMPLE_THRESHOLD, LOW_SEAT_THRESHOLD } from '@/app/_shared/seat-level';

// 선택 필드는 DB(Prisma)에서 null로, API JSON에서 null 또는 누락으로 올 수 있다.
export interface BusRoute {
  id: string;
  routeName: string;
  type: string;
  routeTypeName?: string | null;
  startStopName: string;
  endStopName: string;
  company?: string | null;
  turnStationId?: string | null;
  turnStationName?: string | null;
}

export interface BusStopSeat {
  busRouteId: string;
  stopId: string;
  stopName: string;
  averageSeats: number;
  dayOfWeek: number;
  hourOfDay: number;
  samplesCount: number;
}

export interface BusStop {
  busRouteId: string;
  stationId: string;
  stationName: string;
  stationSeq: number;
  x?: number | null;
  y?: number | null;
}

export interface SeatStat {
  averageSeats: number;
  samplesCount: number;
}

export interface RouteDirection {
  label: string;
  stops: BusStop[];
}

// ---------- 조건(요일 묶음 · 시간대) ----------

export type DayGroup = 'weekday' | 'sat' | 'sun' | 'all';

// 요일 매핑 (Date.getDay() 인덱스와 동일)
export const DAY_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export const DAY_GROUPS: { key: DayGroup; label: string; days: number[] }[] = [
  { key: 'weekday', label: '평일', days: [1, 2, 3, 4, 5] },
  { key: 'sat', label: '토', days: [6] },
  { key: 'sun', label: '일', days: [0] },
  { key: 'all', label: '전체', days: [0, 1, 2, 3, 4, 5, 6] },
];

export const getDayGroupDays = (group: DayGroup) =>
  DAY_GROUPS.find(item => item.key === group)?.days ?? DAY_GROUPS[0].days;

// 히트맵 행 순서 (출퇴근 기준으로 월요일부터)
export const HEATMAP_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// 수집 운영 시간(06:00~22:00)에 해당하는 시간대
export const HOUR_OPTIONS = Array.from({ length: 16 }, (_, i) => i + 6);

// 운행 시간 밖에 접속했을 때 기본으로 보여줄 시간대 (출근 시간)
const FALLBACK_HOUR = 8;

export interface Condition {
  dayGroup: DayGroup;
  hour: number | null; // null = 종일
  openStop: string | null; // getStopKey() 값
}

// 수집기는 TZ=Asia/Seoul 기준으로 요일/시간을 저장하므로, 기기 시간대와 무관하게 서울 시간으로 계산한다.
export const getSeoulNow = (date: Date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const weekday = parts.find(part => part.type === 'weekday')?.value ?? 'Mon';
  const hour = Number(parts.find(part => part.type === 'hour')?.value ?? FALLBACK_HOUR);
  const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  return { dayOfWeek: dayOfWeek === -1 ? 1 : dayOfWeek, hour };
};

export const getDayGroupOf = (dayOfWeek: number): DayGroup =>
  dayOfWeek === 0 ? 'sun' : dayOfWeek === 6 ? 'sat' : 'weekday';

// 첫 화면 기본 조건: 오늘 요일 묶음 + 지금 시간대
export const getDefaultCondition = (date: Date = new Date()): Condition => {
  const { dayOfWeek, hour } = getSeoulNow(date);
  return {
    dayGroup: getDayGroupOf(dayOfWeek),
    hour: HOUR_OPTIONS.includes(hour) ? hour : FALLBACK_HOUR,
    openStop: null,
  };
};

// URL 쿼리(?day=weekday&hour=8&stop=...)에서 조건을 읽는다. 잘못된 값은 기본값으로 대체한다.
export const parseCondition = (get: (key: string) => string | null, fallback: Condition): Condition => {
  const day = get('day');
  const hourParam = get('hour');
  const hourNumber = hourParam === null ? NaN : Number(hourParam);
  return {
    dayGroup: DAY_GROUPS.some(item => item.key === day) ? (day as DayGroup) : fallback.dayGroup,
    hour: hourParam === 'all' ? null : HOUR_OPTIONS.includes(hourNumber) ? hourNumber : fallback.hour,
    openStop: get('stop') || fallback.openStop,
  };
};

export const buildConditionQuery = ({ dayGroup, hour, openStop }: Condition) => {
  const params = new URLSearchParams({ day: dayGroup, hour: hour === null ? 'all' : String(hour) });
  if (openStop) params.set('stop', openStop);
  return `?${params.toString()}`;
};

export const describeCondition = (dayGroup: DayGroup, hour: number | null) => {
  const group = DAY_GROUPS.find(item => item.key === dayGroup) ?? DAY_GROUPS[0];
  const dayLabel = group.days.length === 1 ? `${group.label}요일` : group.label;
  return `${dayLabel} · ${hour === null ? '종일' : `${hour}시대`}`;
};

// 서버에는 요일만 보낸다. 시간대·정류장은 받은 데이터에서 거른다.
// - 시간대/정류장 변경 시 추가 요청이 없어 egress가 줄어든다.
// - 노선도·시간 선택기·히트맵이 같은 데이터를 본다.
export const buildSeatsQueryString = (days: number[]) => {
  const params = new URLSearchParams();
  days.forEach(day => {
    params.append('dayOfWeek', day.toString());
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

// ---------- 잔여석 등급 ----------

// 펼친 정류장 행 식별자. 같은 정류장이 양방향에 모두 나올 수 있어 순번까지 포함한다.
export const getStopKey = (stop: BusStop) => `${stop.stationId}-${stop.stationSeq}`;

// ---------- 표기 ----------

// ---------- 통계 계산 ----------

// 샘플 수 가중 평균
export const weightedAverage = (rows: BusStopSeat[]): SeatStat | null => {
  let weightedSum = 0;
  let totalSamples = 0;
  rows.forEach(row => {
    weightedSum += row.averageSeats * row.samplesCount;
    totalSamples += row.samplesCount;
  });
  return totalSamples > 0 ? { averageSeats: weightedSum / totalSamples, samplesCount: totalSamples } : null;
};

const matchesCondition = (row: BusStopSeat, days: number[], hour: number | null) =>
  days.includes(row.dayOfWeek) && (hour === null || row.hourOfDay === hour);

// 정류장별 잔여석 (선택한 요일 묶음 · 시간대)
export const calculateStopStats = (seatData: BusStopSeat[], days: number[], hour: number | null) => {
  const rowsByStop = new Map<string, BusStopSeat[]>();
  seatData.forEach(row => {
    if (!matchesCondition(row, days, hour)) return;
    const rows = rowsByStop.get(row.stopId);
    if (rows) rows.push(row);
    else rowsByStop.set(row.stopId, [row]);
  });
  const stats = new Map<string, SeatStat>();
  rowsByStop.forEach((rows, stopId) => {
    const stat = weightedAverage(rows);
    if (stat) stats.set(stopId, stat);
  });
  return stats;
};

// 시간대별 노선 전체 평균 (시간 선택기 막대)
export const calculateHourlyRouteStats = (seatData: BusStopSeat[], days: number[]) => {
  const stats = new Map<number, SeatStat>();
  HOUR_OPTIONS.forEach(hour => {
    const stat = weightedAverage(seatData.filter(row => matchesCondition(row, days, hour)));
    if (stat) stats.set(hour, stat);
  });
  return stats;
};

// 선택한 조건의 노선 전체 평균 (전광판)
export const calculateRouteStat = (seatData: BusStopSeat[], days: number[], hour: number | null) =>
  weightedAverage(seatData.filter(row => matchesCondition(row, days, hour)));

// 특정 정류장의 요일·시간대별 값 (히트맵). key: `${dayOfWeek}-${hourOfDay}`
export const buildStopHeatmap = (seatData: BusStopSeat[], stopId: string) => {
  const cells = new Map<string, BusStopSeat>();
  seatData.forEach(row => {
    if (row.stopId === stopId) cells.set(`${row.dayOfWeek}-${row.hourOfDay}`, row);
  });
  return cells;
};

// ---------- 노선 방향 ----------

// 회차 정류장 기준으로 두 방향으로 나눈다. (회차 정류장은 첫 방향의 마지막)
// 회차 정보가 없으면 종점명과 같은 정류장을, 그것도 없으면 중간 지점을 회차로 본다.
export const splitRouteDirections = (busStops: BusStop[], busRoute: BusRoute): RouteDirection[] => {
  if (busStops.length === 0) return [];

  let turnIndex = busRoute.turnStationId
    ? busStops.findIndex(stop => stop.stationId === busRoute.turnStationId)
    : -1;
  if (turnIndex === -1) {
    const endName = splitStationName(busRoute.endStopName).base;
    turnIndex = busStops.findIndex((stop, index) => index > 0 && splitStationName(stop.stationName).base === endName);
  }
  if (turnIndex === -1) {
    turnIndex = Math.floor(busStops.length / 2);
  }

  const turnName = splitStationName(busStops[turnIndex].stationName).base;
  const startName = splitStationName(busRoute.startStopName).base;
  const directions: RouteDirection[] = [{ label: `${turnName} 방면`, stops: busStops.slice(0, turnIndex + 1) }];
  const returnStops = busStops.slice(turnIndex + 1);
  if (returnStops.length > 0) {
    directions.push({ label: `${startName} 방면`, stops: returnStops });
  }
  return directions;
};

// 전광판 요약 판단에 쓸 만한 값인지. 측정이 적은 정류장은 우연한 값일 수 있어 뺀다.
const isReliable = (stat: SeatStat | undefined): stat is SeatStat =>
  stat !== undefined && stat.samplesCount >= LOW_SAMPLE_THRESHOLD;

// 방향별로 잔여석이 처음 6석 밑으로 떨어지는 정류장
export const findFirstLowStop = (stops: BusStop[], stopStats: Map<string, SeatStat>) =>
  stops.find(stop => {
    const stat = stopStats.get(stop.stationId);
    return isReliable(stat) && stat.averageSeats < LOW_SEAT_THRESHOLD;
  }) ?? null;

// 방향에서 잔여석이 가장 적은 정류장 (6석 밑으로 떨어지지 않을 때 요약에 쓴다)
export const findMinStop = (stops: BusStop[], stopStats: Map<string, SeatStat>) => {
  let min: { stop: BusStop; stat: SeatStat } | null = null;
  stops.forEach(stop => {
    const stat = stopStats.get(stop.stationId);
    if (isReliable(stat) && (min === null || stat.averageSeats < min.stat.averageSeats)) {
      min = { stop, stat };
    }
  });
  return min as { stop: BusStop; stat: SeatStat } | null;
};
