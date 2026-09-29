import Link from 'next/link';
import { RouteBadge, RouteTag, StationName, splitRouteName } from '@/app/_shared/route-display';
import { describeDirectionSummary } from '@/app/_shared/route-summary';
import { formatSeats, toSeatRatio } from '@/app/_shared/seat-level';
import { HOUR_OPTIONS } from '@/app/bus/[id]/_lib/bus-detail';
import type { RecentRoute } from './route-search';
import type { SummaryCard } from './useRecentRouteSummaries';

interface CardProps {
  card: SummaryCard;
  hour: number | null;
  detailQuery: string;
  onRemember: (route: RecentRoute) => void;
}

const SummaryCardItem = ({ card, hour, detailQuery, onRemember }: CardProps) => {
  const { route, summary, isLoading } = card;
  const { number, tag } = splitRouteName(route.routeName);

  return (
    <li>
      {/* 카드와 같은 조건(요일 묶음·시간대)으로 상세 화면을 연다. */}
      <Link
        href={`/bus/${route.id}${detailQuery}`}
        onClick={() => onRemember(route)}
        className="grid gap-2 rounded-2xl border border-line p-3 hover:border-line-strong"
      >
        <span className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-0.5">
          <RouteBadge routeName={number} type={route.type} className="row-span-2" />
          <span className="truncate text-xs text-ink-soft">
            <StationName name={route.startStopName} /> → <StationName name={route.endStopName} />
            {tag && <RouteTag>{tag}</RouteTag>}
          </span>
          <span className="text-[11px] text-muted">
            {summary && summary.routeAverage !== null && (
              <>
                노선 평균 <b className="font-mono font-medium text-ink">{formatSeats(summary.routeAverage)}</b>석
                {summary.busRoute.company && ` · ${summary.busRoute.company}`}
              </>
            )}
            {summary && summary.routeAverage === null && '이 시간대 데이터 없음'}
            {!summary && isLoading && '불러오는 중…'}
          </span>
        </span>

        {summary && (
          <>
            <span className="grid gap-1 rounded-xl bg-led-bg px-2.5 py-2 text-led">
              {summary.directions.map(direction => (
                <span key={direction.label} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-2 text-xs leading-snug">
                  <span className="truncate text-led-dim">{direction.label}</span>
                  <span>{describeDirectionSummary(direction)}</span>
                </span>
              ))}
            </span>
            {/* 시간대별 노선 평균. 파란 막대가 지금 시간대다. */}
            <span className="grid gap-0.5" aria-hidden="true">
              <span className="flex h-[30px] items-end gap-[2px]">
                {summary.hourly.map((value, index) => (
                  <span
                    key={HOUR_OPTIONS[index]}
                    className={`min-h-[2px] flex-1 rounded-sm ${HOUR_OPTIONS[index] === hour ? 'bg-accent' : 'bg-seat-none'}`}
                    // 막대 높이는 데이터 값이라 정적 클래스로 표현할 수 없어 인라인 스타일을 쓴다.
                    style={{ height: `${value === null ? 0 : toSeatRatio(value) * 100}%` }}
                  />
                ))}
              </span>
              <span className="flex justify-between font-mono text-[9px] text-muted">
                <span>{HOUR_OPTIONS[0]}시</span>
                <span>{HOUR_OPTIONS[HOUR_OPTIONS.length - 1]}시</span>
              </span>
            </span>
          </>
        )}

        {!summary && isLoading && (
          <span aria-hidden="true" className="grid gap-1.5">
            <span className="h-11 animate-pulse rounded-xl bg-line" />
            <span className="h-[30px] animate-pulse rounded bg-sunken" />
          </span>
        )}

        {!summary && !isLoading && (
          <span className="text-xs text-muted">요약을 불러오지 못했습니다. 눌러서 자세히 보세요.</span>
        )}
      </Link>
    </li>
  );
};

interface Props {
  cards: SummaryCard[];
  moreRoutes: RecentRoute[];
  conditionLabel: string;
  hour: number | null;
  detailQuery: string;
  onRemember: (route: RecentRoute) => void;
  onOpenRoute: (route: RecentRoute) => void;
}

// 최근 본 노선의 '지금 기준' 요약 카드. 다시 찾아온 사람이 상세 화면에 들어가지 않고도 오늘 상황을 본다.
export const RecentRouteCards = ({ cards, moreRoutes, conditionLabel, hour, detailQuery, onRemember, onOpenRoute }: Props) => (
  <section aria-labelledby="my-routes" className="grid gap-2 px-4 pb-5">
    <div className="flex items-baseline justify-between gap-2 text-xs text-muted">
      <h2 id="my-routes" className="font-semibold text-ink">
        내 노선 · 지금 기준
      </h2>
      <span>{conditionLabel}</span>
    </div>

    <ul className="grid gap-2.5">
      {cards.map(card => (
        <SummaryCardItem key={card.route.id} card={card} hour={hour} detailQuery={detailQuery} onRemember={onRemember} />
      ))}
    </ul>

    {moreRoutes.length > 0 && (
      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted">
        <span className="mr-0.5">그 밖에 최근 본 노선</span>
        {moreRoutes.map(route => (
          <button
            key={route.id}
            type="button"
            title={`${route.startStopName} → ${route.endStopName}`}
            onClick={() => onOpenRoute(route)}
            className="rounded-full border border-line px-2.5 py-0.5 text-[13px] text-ink hover:border-faint"
          >
            {route.routeName}
          </button>
        ))}
      </div>
    )}
  </section>
);
