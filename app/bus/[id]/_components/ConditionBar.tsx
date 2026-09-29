import { formatSeats, toSeatRatio } from '@/app/_shared/seat-level';
import { DAY_GROUPS, HOUR_OPTIONS, type DayGroup, type SeatStat } from '../_lib/bus-detail';

interface Props {
  dayGroup: DayGroup;
  todayGroup: DayGroup;
  hour: number | null;
  hourlyStats: Map<number, SeatStat>;
  isRefreshing: boolean;
  onSelectDayGroup: (dayGroup: DayGroup) => void;
  onSelectHour: (hour: number) => void;
  onToggleAllDay: () => void;
}

// 요일 묶음 + 시간대 조건. 스크롤해도 화면 위에 붙어 있어 노선도를 보면서 조건을 바꿀 수 있다.
// 시간 선택기의 막대 높이는 그 시간대의 노선 전체 평균 잔여석이라, 누르기 전에 여유로운 시간대가 보인다.
export const ConditionBar = ({
  dayGroup,
  todayGroup,
  hour,
  hourlyStats,
  isRefreshing,
  onSelectDayGroup,
  onSelectHour,
  onToggleAllDay,
}: Props) => (
  <div className="sticky top-0 z-10 grid gap-2 border-y border-line bg-surface px-3 pb-2 pt-2.5">
    <div role="group" aria-label="요일" className="grid grid-cols-4 gap-1 rounded-lg border border-line bg-subtle p-[3px]">
      {DAY_GROUPS.map(group => {
        const isActive = group.key === dayGroup;
        return (
          <button
            key={group.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelectDayGroup(group.key)}
            className={`rounded-md py-1.5 text-sm ${isActive ? 'bg-surface font-semibold text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            {group.label}
            {group.key === todayGroup && <span className="ml-1 align-[1px] text-[10px] font-normal text-accent">오늘</span>}
          </button>
        );
      })}
    </div>

    <div className="flex items-center justify-between text-xs text-muted">
      <span>
        시간대별 노선 평균
        {isRefreshing && <span className="ml-1.5 text-faint">업데이트 중…</span>}
      </span>
      <button
        type="button"
        aria-pressed={hour === null}
        onClick={onToggleAllDay}
        className={`rounded-full border px-2.5 py-px text-xs ${hour === null ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:text-ink'}`}
      >
        종일
      </button>
    </div>

    <div role="group" aria-label="시간대" className="grid grid-cols-[repeat(16,minmax(0,1fr))] items-end gap-[2px]">
      {HOUR_OPTIONS.map(optionHour => {
        const stat = hourlyStats.get(optionHour);
        const isSelected = hour === optionHour;
        const barColor = isSelected ? 'bg-accent' : hour === null ? 'bg-accent-muted' : 'bg-seat-none';
        return (
          <button
            key={optionHour}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${optionHour}시, 노선 평균 ${stat ? `${formatSeats(stat.averageSeats)}석` : '데이터 없음'}`}
            onClick={() => onSelectHour(optionHour)}
            className="grid justify-items-center gap-[3px]"
          >
            <span className="flex h-[34px] w-full items-end rounded-[3px] bg-sunken">
              {/* 막대 높이는 데이터 값이라 정적 클래스로 표현할 수 없어 인라인 스타일을 쓴다. */}
              <span
                className={`w-full rounded-[3px] ${barColor}`}
                style={{ height: `${stat ? toSeatRatio(stat.averageSeats) * 100 : 0}%` }}
              />
            </span>
            <span className={`font-mono text-[10px] tabular-nums ${isSelected ? 'font-semibold text-accent' : 'text-muted'}`}>
              {optionHour}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);
