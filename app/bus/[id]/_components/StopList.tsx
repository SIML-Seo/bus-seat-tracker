import { Fragment } from 'react';
import {
  LOW_SAMPLE_THRESHOLD,
  SEAT_LEVEL_BG_CLASS,
  SEAT_LEVEL_LABEL,
  SEAT_LEVEL_TEXT_CLASS,
  formatSeats,
  getSeatLevel,
  toSeatRatio,
} from '@/app/_shared/seat-level';
import { getStopKey, type BusStop, type BusStopSeat, type SeatStat } from '../_lib/bus-detail';
import type { DirectionView, HeatmapCell } from '../_hooks/useBusDetailController';
import { StationName, splitStationName } from '@/app/_shared/route-display';
import { StationHeatmap } from './StationHeatmap';

interface StopRowProps {
  stop: BusStop;
  stat?: SeatStat;
  isFirst: boolean;
  isLast: boolean;
  isOpen: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

const StopRow = ({ stop, stat, isFirst, isLast, isOpen, onToggle, children }: StopRowProps) => {
  const panelId = `stop-panel-${stop.stationId}-${stop.stationSeq}`;
  const level = stat ? getSeatLevel(stat.averageSeats) : null;
  const isThin = stat !== undefined && stat.samplesCount < LOW_SAMPLE_THRESHOLD;
  // 노선 선: 방향의 첫 정류장은 점 아래로만, 마지막 정류장은 점 위로만 긋는다.
  const railClass = isFirst && isLast ? 'hidden' : isFirst ? 'top-[14px] bottom-0' : isLast ? 'top-0 h-[14px]' : 'inset-y-0';

  return (
    <li>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
        className="grid w-full grid-cols-[30px_18px_minmax(0,1fr)] gap-x-2 pl-2 pr-3.5 text-left hover:bg-subtle"
      >
        <span className="pt-[11px] text-right font-mono text-[11px] tabular-nums text-muted">{stop.stationSeq}</span>
        <span className="relative" aria-hidden="true">
          <span className={`absolute left-[7px] w-1 bg-route ${railClass}`} />
          <span className={`absolute left-[3px] top-[10px] h-3 w-3 rounded-full border-[3px] border-route ${isOpen ? 'bg-route' : 'bg-surface'}`} />
        </span>
        <span className="grid min-w-0 gap-[5px] pb-[9px] pt-[7px]">
          <span className={`text-sm leading-snug [overflow-wrap:anywhere] ${isOpen ? 'font-semibold' : ''}`}>
            <StationName name={stop.stationName} />
          </span>
          <span className="grid grid-cols-[minmax(0,1fr)_4.6rem] items-center gap-2.5">
            <span className="h-2 overflow-hidden rounded border border-line bg-sunken">
              {stat && level && (
                // 막대 길이는 데이터 값이라 정적 클래스로 표현할 수 없어 인라인 스타일을 쓴다.
                <span
                  className={`block h-full ${SEAT_LEVEL_BG_CLASS[level]} ${isThin ? 'seat-bar-thin' : ''}`}
                  style={{ width: `${toSeatRatio(stat.averageSeats) * 100}%` }}
                />
              )}
            </span>
            <span className="flex items-baseline justify-end gap-1 whitespace-nowrap text-xs text-muted">
              {stat ? (
                <>
                  <b className="font-mono text-sm font-medium tabular-nums text-ink">{formatSeats(stat.averageSeats)}</b>석
                </>
              ) : (
                '데이터 없음'
              )}
            </span>
          </span>
          {stat && level && (
            <span className="flex gap-2 text-[11px] text-muted">
              <span className={`font-semibold ${SEAT_LEVEL_TEXT_CLASS[level]}`}>{SEAT_LEVEL_LABEL[level]}</span>
              <span>
                측정 {stat.samplesCount}회{isThin && ' · 적음'}
              </span>
            </span>
          )}
        </span>
      </button>
      {children}
    </li>
  );
};

const LEGEND_ITEMS = [
  { className: 'bg-seat-plenty', label: '여유 15석 이상' },
  { className: 'bg-seat-ok', label: '보통 11~14석' },
  { className: 'bg-seat-low', label: '적음 6~10석' },
  { className: 'bg-seat-crit', label: '거의 없음 6석 미만' },
  { className: 'bg-seat-ok seat-bar-thin', label: `측정 ${LOW_SAMPLE_THRESHOLD}회 미만` },
];

const SeatLegend = () => (
  <div aria-label="범례" className="flex flex-wrap gap-x-3 gap-y-1.5 border-t border-line px-4 pb-5 pt-3 text-[11px] text-muted">
    {LEGEND_ITEMS.map(item => (
      <span key={item.label} className="inline-flex items-center gap-[5px]">
        <i className={`inline-block h-2.5 w-2.5 rounded-sm ${item.className}`} />
        {item.label}
      </span>
    ))}
  </div>
);

interface Props {
  directions: DirectionView[];
  stopsMessage?: string;
  stopStats: Map<string, SeatStat>;
  openStop: string | null;
  seatData: BusStopSeat[];
  days: number[];
  hour: number | null;
  pickedCell: HeatmapCell | null;
  onToggleStop: (stopKey: string) => void;
  onPickCell: (cell: HeatmapCell) => void;
}

// 세로 노선도. 회차 정류장에서 방향이 바뀌고, 정류장을 누르면 그 자리에서 히트맵이 펼쳐진다.
export const StopList = ({
  directions,
  stopsMessage,
  stopStats,
  openStop,
  seatData,
  days,
  hour,
  pickedCell,
  onToggleStop,
  onPickCell,
}: Props) => {
  if (directions.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted">{stopsMessage || '정류장 정보를 불러올 수 없습니다.'}</p>
    );
  }

  const turnStop = directions[0].stops[directions[0].stops.length - 1];

  return (
    <>
      <ol className="pb-2 pt-1">
        {directions.map((direction, directionIndex) => (
          <Fragment key={direction.label}>
            <li className="flex justify-between border-b border-line px-4 pb-1.5 pt-2.5 text-[13px] font-semibold text-ink">
              {direction.label}
              <span className="font-normal text-muted">정류장 {direction.stops.length}개</span>
            </li>
            {direction.stops.map((stop, index) => {
              // 같은 정류장이 양방향에 모두 나올 수 있어 순번까지 합쳐 행을 구분한다.
              const stopKey = getStopKey(stop);
              const isOpen = openStop === stopKey;
              return (
                <StopRow
                  key={`${stop.stationId}-${stop.stationSeq}`}
                  stop={stop}
                  stat={stopStats.get(stop.stationId)}
                  isFirst={index === 0}
                  isLast={index === direction.stops.length - 1}
                  isOpen={isOpen}
                  onToggle={() => onToggleStop(stopKey)}
                >
                  {isOpen && (
                    <StationHeatmap
                      id={`stop-panel-${stop.stationId}-${stop.stationSeq}`}
                      stopId={stop.stationId}
                      seatData={seatData}
                      days={days}
                      hour={hour}
                      pickedCell={pickedCell}
                      onPickCell={onPickCell}
                    />
                  )}
                </StopRow>
              );
            })}
            {directionIndex === 0 && directions.length > 1 && (
              <li className="mx-4 my-1.5 rounded-lg border border-dashed border-route px-2.5 py-1.5 text-center text-xs text-route-ink">
                회차 · {splitStationName(turnStop.stationName).base}
              </li>
            )}
          </Fragment>
        ))}
      </ol>
      <SeatLegend />
    </>
  );
};
