// 노선 요약 (홈 '내 노선' 카드).
// 서버는 SQL 집계 결과(정류장별·시간대별 합계)를 이 함수로 요약해 돌려주고, 홈은 그대로 그린다.
// 방향 분리·'6석 미만 시작 정류장' 판단은 노선 상세와 같은 함수를 써서 두 화면의 결과가 같게 한다.
import {
  HOUR_OPTIONS,
  findFirstLowStop,
  findMinStop,
  splitRouteDirections,
  type BusRoute,
  type BusStop,
  type DayGroup,
  type SeatStat,
} from '@/app/bus/[id]/_lib/bus-detail';
import { splitStationName } from './route-display';
import { LOW_SEAT_THRESHOLD, formatSeats } from './seat-level';

// SUM(averageSeats * samplesCount), SUM(samplesCount)
export interface StopAggregate {
  stopId: string;
  weightedSum: number;
  samples: number;
}

export interface HourAggregate {
  hour: number;
  weightedSum: number;
  samples: number;
}

export interface DirectionSummary {
  label: string;
  firstLowStopName: string | null;
  minStop: { name: string; averageSeats: number } | null;
  hasData: boolean;
}

export interface RouteSummaryResponse {
  busRoute: Pick<BusRoute, 'id' | 'routeName' | 'type' | 'routeTypeName' | 'startStopName' | 'endStopName' | 'company'>;
  dayGroup: DayGroup;
  hour: number | null;
  routeAverage: number | null;
  directions: DirectionSummary[];
  // HOUR_OPTIONS 순서의 시간대별 노선 평균 (데이터 없으면 null)
  hourly: (number | null)[];
}

const toStat = (weightedSum: number, samples: number): SeatStat | null =>
  samples > 0 ? { averageSeats: weightedSum / samples, samplesCount: samples } : null;

interface BuildInput {
  busRoute: BusRoute;
  busStops: BusStop[];
  stopAggregates: StopAggregate[];
  hourAggregates: HourAggregate[];
  dayGroup: DayGroup;
  hour: number | null;
}

export const buildRouteSummary = ({
  busRoute,
  busStops,
  stopAggregates,
  hourAggregates,
  dayGroup,
  hour,
}: BuildInput): RouteSummaryResponse => {
  const stopStats = new Map<string, SeatStat>();
  let routeWeightedSum = 0;
  let routeSamples = 0;
  stopAggregates.forEach(row => {
    const stat = toStat(row.weightedSum, row.samples);
    if (stat) stopStats.set(row.stopId, stat);
    routeWeightedSum += row.weightedSum;
    routeSamples += row.samples;
  });

  const hourlyStats = new Map(hourAggregates.map(row => [row.hour, toStat(row.weightedSum, row.samples)]));

  return {
    busRoute: {
      id: busRoute.id,
      routeName: busRoute.routeName,
      type: busRoute.type,
      routeTypeName: busRoute.routeTypeName,
      startStopName: busRoute.startStopName,
      endStopName: busRoute.endStopName,
      company: busRoute.company,
    },
    dayGroup,
    hour,
    routeAverage: toStat(routeWeightedSum, routeSamples)?.averageSeats ?? null,
    directions: splitRouteDirections(busStops, busRoute).map(direction => {
      const firstLowStop = findFirstLowStop(direction.stops, stopStats);
      const minStop = findMinStop(direction.stops, stopStats);
      return {
        label: direction.label,
        firstLowStopName: firstLowStop ? splitStationName(firstLowStop.stationName).base : null,
        minStop: minStop
          ? { name: splitStationName(minStop.stop.stationName).base, averageSeats: minStop.stat.averageSeats }
          : null,
        hasData: direction.stops.some(stop => stopStats.has(stop.stationId)),
      };
    }),
    hourly: HOUR_OPTIONS.map(optionHour => hourlyStats.get(optionHour)?.averageSeats ?? null),
  };
};

// 카드·전광판 한 줄 문구 (노선 상세 전광판과 같은 규칙)
export const describeDirectionSummary = (direction: DirectionSummary) => {
  if (direction.firstLowStopName) return `${direction.firstLowStopName}부터 ${LOW_SEAT_THRESHOLD}석 미만`;
  if (direction.minStop) return `가장 적은 곳 ${direction.minStop.name} ${formatSeats(direction.minStop.averageSeats)}석`;
  return direction.hasData ? '측정이 적어 판단 보류' : '데이터 없음';
};
