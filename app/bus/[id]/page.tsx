'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useBusDetailController } from './_hooks/useBusDetailController';
import { RouteBadge, StationName } from '@/app/_shared/route-display';
import { BisSummary } from './_components/BisSummary';
import { ConditionBar } from './_components/ConditionBar';
import { StopList } from './_components/StopList';

const LoadingScreen = () => (
  <div className="app-theme flex min-h-screen items-center justify-center bg-canvas">
    <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-accent"></div>
    <p className="ml-3">데이터를 불러오는 중...</p>
  </div>
);

// 에러/노선 없음 화면 공통 틀
const StatusScreen = ({ boxClassName, message }: { boxClassName: string; message: string }) => (
  <div className="app-theme flex min-h-screen flex-col items-center justify-center bg-canvas p-6">
    <div className={`mb-6 w-full max-w-md rounded-lg border p-6 ${boxClassName}`}>
      <p className="text-center">{message}</p>
    </div>
    <Link href="/" className="text-accent hover:underline">
      홈으로 돌아가기
    </Link>
  </div>
);

const BusDetail = () => {
  const params = useParams();
  const busId = params.id as string;
  const { view, state, handlers } = useBusDetailController(busId);

  if (view.status === 'loading') return <LoadingScreen />;

  if (view.status === 'error') {
    return <StatusScreen boxClassName="border-danger-line bg-danger-soft text-danger" message="데이터를 불러오는 중 오류가 발생했습니다." />;
  }

  if (view.status === 'notFound') {
    return <StatusScreen boxClassName="border-warning-line bg-warning-soft text-warning" message="버스 노선 정보를 찾을 수 없습니다." />;
  }

  const { data } = view;
  const { busRoute } = data;

  return (
    <div className="app-theme min-h-screen bg-canvas">
      <main className="mx-auto min-h-screen max-w-2xl bg-surface sm:border-x sm:border-line">
        {/* 노선 헤더 */}
        <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-4 pb-3 pt-4">
          <Link
            href="/"
            aria-label="검색으로 돌아가기"
            className="row-span-2 grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-soft hover:bg-subtle"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1>
              <RouteBadge routeName={busRoute.routeName} type={busRoute.type} />
            </h1>
            <span className="text-xs text-muted">
              {[busRoute.routeTypeName || busRoute.type, busRoute.company].filter(Boolean).join(' · ')}
            </span>
          </div>
          <p className="text-[13px] text-muted [overflow-wrap:anywhere]">
            <StationName name={busRoute.startStopName} /> ↔ <StationName name={busRoute.endStopName} />
          </p>
        </header>

        <BisSummary
          routeName={busRoute.routeName}
          conditionLabel={data.conditionLabel}
          routeStat={data.routeStat}
          directions={data.directions}
        />

        <ConditionBar
          dayGroup={state.dayGroup}
          todayGroup={state.todayGroup}
          hour={state.hour}
          hourlyStats={data.hourlyStats}
          isRefreshing={state.isRefreshing}
          onSelectDayGroup={handlers.selectDayGroup}
          onSelectHour={handlers.selectHour}
          onToggleAllDay={handlers.toggleAllDay}
        />

        <StopList
          directions={data.directions}
          stopsMessage={data.stopsMessage}
          stopStats={data.stopStats}
          openStop={state.openStop}
          seatData={data.seatData}
          days={state.days}
          hour={state.hour}
          pickedCell={state.pickedCell}
          onToggleStop={handlers.toggleStop}
          onPickCell={handlers.pickCell}
        />

        {/* 데이터 안내 */}
        <footer className="border-t border-line px-4 pb-8 pt-4 text-xs leading-relaxed text-muted">
          <ul className="list-disc space-y-1 pl-4">
            <li>잔여석은 수집된 값을 측정 횟수로 가중 평균한 값이며, 실시간 정보와 다를 수 있습니다.</li>
            <li>측정이 3회 미만인 값은 빗금으로 표시하고, 전광판 요약 판단에서는 뺍니다.</li>
            <li>정류장을 누르면 요일·시간대별 표가 펼쳐집니다. 조건은 주소에 저장되어 공유할 수 있습니다.</li>
          </ul>
        </footer>
      </main>
    </div>
  );
};

// useSearchParams(조건을 URL에서 읽음)를 쓰는 컴포넌트는 Suspense 경계 안에 둔다.
export default function BusDetailPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <BusDetail />
    </Suspense>
  );
}
