import { Fragment } from 'react';
import {
  LOW_SAMPLE_THRESHOLD,
  SEAT_LEVEL_BG_CLASS,
  formatSeats,
  getSeatLevel,
} from '@/app/_shared/seat-level';
import {
  DAY_OF_WEEK,
  HEATMAP_DAY_ORDER,
  HOUR_OPTIONS,
  buildStopHeatmap,
  type BusStopSeat,
} from '../_lib/bus-detail';
import type { HeatmapCell } from '../_hooks/useBusDetailController';

interface Props {
  id: string;
  stopId: string;
  seatData: BusStopSeat[];
  days: number[];
  hour: number | null;
  pickedCell: HeatmapCell | null;
  onPickCell: (cell: HeatmapCell) => void;
}

// 정류장 하나의 요일 × 시간대 잔여석. 행은 선택한 요일 묶음만 보여준다. (응답이 요일 묶음 단위이므로)
export const StationHeatmap = ({ id, stopId, seatData, days, hour, pickedCell, onPickCell }: Props) => {
  const cells = buildStopHeatmap(seatData, stopId);
  const rows = HEATMAP_DAY_ORDER.filter(day => days.includes(day));
  const picked = pickedCell ? cells.get(`${pickedCell.dayOfWeek}-${pickedCell.hour}`) : undefined;

  return (
    <div id={id} className="mb-2.5 ml-16 mr-3.5 grid gap-2 rounded-[10px] border border-line bg-subtle p-2.5">
      <div className="grid grid-cols-[18px_repeat(16,minmax(0,1fr))] gap-[2px]">
        <span />
        {HOUR_OPTIONS.map(optionHour => (
          <span key={optionHour} className="text-center font-mono text-[9px] text-muted">
            {optionHour % 3 === 0 ? optionHour : ''}
          </span>
        ))}
        {rows.map(day => (
          <Fragment key={day}>
            <span className="self-center text-[11px] text-ink-soft">{DAY_OF_WEEK[day]}</span>
            {HOUR_OPTIONS.map(optionHour => {
              const cell = cells.get(`${day}-${optionHour}`);
              const isPicked = pickedCell?.dayOfWeek === day && pickedCell.hour === optionHour;
              const colorClass = cell ? SEAT_LEVEL_BG_CLASS[getSeatLevel(cell.averageSeats)] : 'bg-surface';
              const thinClass = cell && cell.samplesCount < LOW_SAMPLE_THRESHOLD ? 'opacity-40' : '';
              const ringClass = isPicked ? 'ring-2 ring-ink' : optionHour === hour ? 'ring-1 ring-ink' : '';
              return (
                <button
                  key={optionHour}
                  type="button"
                  aria-pressed={isPicked}
                  aria-label={`${DAY_OF_WEEK[day]}요일 ${optionHour}시 ${cell ? `${formatSeats(cell.averageSeats)}석` : '데이터 없음'}`}
                  onClick={() => onPickCell({ dayOfWeek: day, hour: optionHour })}
                  className={`aspect-square min-h-3 rounded-[2px] ${colorClass} ${thinClass} ${ringClass}`}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
      <p className="min-h-[1.5em] text-xs text-muted">
        {!pickedCell && '칸을 누르면 값과 측정 횟수가 나옵니다. 테두리 열이 선택한 시간대입니다.'}
        {pickedCell && picked && (
          <>
            {DAY_OF_WEEK[pickedCell.dayOfWeek]}요일 {pickedCell.hour}시 ·{' '}
            <b className="font-mono font-medium text-ink">{formatSeats(picked.averageSeats)}석</b> · 측정 {picked.samplesCount}회
          </>
        )}
        {pickedCell && !picked && `${DAY_OF_WEEK[pickedCell.dayOfWeek]}요일 ${pickedCell.hour}시 · 데이터 없음`}
      </p>
    </div>
  );
};
