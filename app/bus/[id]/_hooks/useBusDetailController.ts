import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
  buildConditionQuery,
  buildSeatsQueryString,
  calculateHourlyRouteStats,
  calculateRouteStat,
  calculateStopStats,
  describeCondition,
  findFirstLowStop,
  findMinStop,
  getDayGroupDays,
  getDayGroupOf,
  getDefaultCondition,
  getSeoulNow,
  parseCondition,
  splitRouteDirections,
  type BusRoute,
  type BusStop,
  type BusStopSeat,
  type Condition,
  type DayGroup,
  type RouteDirection,
  type SeatStat,
} from '../_lib/bus-detail';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface StopsResponse {
  stops?: BusStop[];
  message?: string;
}

interface SeatsResponse {
  busRoute?: BusRoute;
  seatData?: BusStopSeat[];
}

export interface DirectionView extends RouteDirection {
  firstLowStop: BusStop | null;
  minStop: { stop: BusStop; stat: SeatStat } | null;
  hasData: boolean;
}

export interface BusDetailData {
  busRoute: BusRoute;
  stopsMessage?: string;
  seatData: BusStopSeat[];
  directions: DirectionView[];
  stopStats: Map<string, SeatStat>;
  hourlyStats: Map<number, SeatStat>;
  routeStat: SeatStat | null;
  conditionLabel: string;
}

export type BusDetailView =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'notFound' }
  | { status: 'ready'; data: BusDetailData };

export interface HeatmapCell {
  dayOfWeek: number;
  hour: number;
}

export const useBusDetailController = (busId: string) => {
  const searchParams = useSearchParams();
  // 첫 화면은 '지금'(서울 기준 오늘 요일 묶음 + 현재 시간대). URL에 조건이 있으면 그 값을 쓴다.
  const [condition, setCondition] = useState<Condition>(() =>
    parseCondition(key => searchParams.get(key), getDefaultCondition())
  );
  const [pickedCell, setPickedCell] = useState<HeatmapCell | null>(null);
  const [todayGroup] = useState<DayGroup>(() => getDayGroupOf(getSeoulNow().dayOfWeek));

  const days = getDayGroupDays(condition.dayGroup);

  const { data: stopsData, error: stopsError } = useSWR<StopsResponse>(
    busId ? `/api/buses/${busId}/stops` : null,
    fetcher
  );

  const { data: seatsData, error: seatsError, isValidating: seatsValidating } = useSWR<SeatsResponse>(
    busId ? `/api/buses/${busId}/seats${buildSeatsQueryString(days)}` : null,
    fetcher,
    // 요일 묶음을 바꾸는 동안 이전 결과를 유지해 화면 전체가 로딩 상태로 바뀌지 않게 한다.
    { keepPreviousData: true }
  );

  // 조건을 URL에 남겨 새로고침·공유·뒤로 가기에서 유지한다.
  // Next.js 15는 history.replaceState를 useSearchParams와 동기화하며, 서버 요청을 만들지 않는다.
  const updateCondition = (patch: Partial<Condition>) => {
    const next = { ...condition, ...patch };
    setCondition(next);
    window.history.replaceState(null, '', `${window.location.pathname}${buildConditionQuery(next)}`);
  };

  const selectDayGroup = (dayGroup: DayGroup) => {
    updateCondition({ dayGroup });
    setPickedCell(null);
  };

  const selectHour = (hour: number) => {
    updateCondition({ hour });
    setPickedCell(null);
  };

  // 종일 ↔ 지금 시간대
  const toggleAllDay = () => {
    updateCondition({ hour: condition.hour === null ? getDefaultCondition().hour : null });
    setPickedCell(null);
  };

  // 같은 정류장 행을 다시 누르면 접는다. (stopKey: getStopKey() 값)
  const toggleStop = (stopKey: string) => {
    updateCondition({ openStop: condition.openStop === stopKey ? null : stopKey });
    setPickedCell(null);
  };

  const pickCell = (cell: HeatmapCell) => {
    setPickedCell(cell);
  };

  const buildView = (): BusDetailView => {
    // keepPreviousData로 조건 변경 중에는 이전 데이터가 남아 있으므로, 로딩 화면은 최초 로딩에만 보인다.
    if ((!stopsData && !stopsError) || (!seatsData && !seatsError)) return { status: 'loading' };
    if (stopsError || seatsError) return { status: 'error' };
    if (!seatsData?.busRoute) return { status: 'notFound' };

    const busRoute = seatsData.busRoute;
    const busStops = stopsData?.stops || [];
    const seatData = seatsData.seatData || [];
    const stopStats = calculateStopStats(seatData, days, condition.hour);

    return {
      status: 'ready',
      data: {
        busRoute,
        stopsMessage: stopsData?.message,
        seatData,
        directions: splitRouteDirections(busStops, busRoute).map(direction => ({
          ...direction,
          firstLowStop: findFirstLowStop(direction.stops, stopStats),
          minStop: findMinStop(direction.stops, stopStats),
          hasData: direction.stops.some(stop => stopStats.has(stop.stationId)),
        })),
        stopStats,
        hourlyStats: calculateHourlyRouteStats(seatData, days),
        routeStat: calculateRouteStat(seatData, days, condition.hour),
        conditionLabel: describeCondition(condition.dayGroup, condition.hour),
      },
    };
  };

  return {
    view: buildView(),
    state: {
      dayGroup: condition.dayGroup,
      days,
      hour: condition.hour,
      openStop: condition.openStop,
      todayGroup,
      pickedCell,
      isRefreshing: seatsValidating,
    },
    handlers: {
      selectDayGroup,
      selectHour,
      toggleAllDay,
      toggleStop,
      pickCell,
    },
  };
};
