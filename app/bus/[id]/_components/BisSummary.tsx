import { splitStationName } from '@/app/_shared/route-display';
import { LOW_SEAT_THRESHOLD, formatSeats } from '@/app/_shared/seat-level';
import { type SeatStat } from '../_lib/bus-detail';
import type { DirectionView } from '../_hooks/useBusDetailController';

interface Props {
  routeName: string;
  conditionLabel: string;
  routeStat: SeatStat | null;
  directions: DirectionView[];
}

const describeDirection = (direction: DirectionView) => {
  if (direction.firstLowStop) {
    return `${splitStationName(direction.firstLowStop.stationName).base}부터 ${LOW_SEAT_THRESHOLD}석 미만`;
  }
  // 6석 밑으로 떨어지지 않으면 가장 적은 곳을 알려준다.
  if (direction.minStop) {
    return `가장 적은 곳 ${splitStationName(direction.minStop.stop.stationName).base} ${formatSeats(direction.minStop.stat.averageSeats)}석`;
  }
  return direction.hasData ? '측정이 적어 판단 보류' : '데이터 없음';
};

// 정류장 안내 전광판(BIS) 톤의 요약. '어디서 타야 앉아 가나'에 바로 답한다.
// 화면에서 유일하게 강하게 표현하는 요소이므로 다른 곳에는 이 톤을 쓰지 않는다.
export const BisSummary = ({ routeName, conditionLabel, routeStat, directions }: Props) => (
  <section aria-label="선택한 조건 요약" aria-live="polite" className="mx-3 mb-3 grid gap-1.5 rounded-xl bg-led-bg px-4 py-3 text-led">
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <span className="font-dot text-[26px] leading-none tracking-wide">{routeName}</span>
      <span className="text-[13px] text-led-dim">{conditionLabel}</span>
      <span className="ml-auto text-[13px]">
        노선 평균 <span className="font-dot text-xl">{routeStat ? formatSeats(routeStat.averageSeats) : '--'}</span>석
      </span>
    </div>
    {directions.map(direction => (
      <p
        key={direction.label}
        className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-2 border-t border-dashed border-led-dim pt-1.5 text-[13px] leading-snug"
      >
        <span className="truncate text-led-dim">{direction.label}</span>
        <span>{describeDirection(direction)}</span>
      </p>
    ))}
  </section>
);
