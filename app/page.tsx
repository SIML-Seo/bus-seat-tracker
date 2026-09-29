'use client';

import { useRouteSearchController } from './_home/useRouteSearchController';
import { SearchResults } from './_home/SearchResults';
import { ContactSection } from './_home/ContactSection';
import { HomeGuide } from './_home/HomeGuide';
import { RecentRouteCards } from './_home/RecentRouteCards';
import { useRecentRouteSummaries } from './_home/useRecentRouteSummaries';

export default function Home() {
  const { state, handlers } = useRouteSearchController();
  const summaries = useRecentRouteSummaries(state.recentRoutes);
  const hasRecentRoutes = state.recentRoutes.length > 0;

  return (
    <div className="app-theme min-h-screen bg-canvas">
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col bg-surface sm:border-x sm:border-line">
        <header className="grid gap-1 px-4 pb-4 pt-7">
          <h1 className="text-[22px] font-bold tracking-tight text-ink">좌석 버스 잔여석</h1>
          <p className="text-sm text-muted">경기 좌석·광역버스의 정류장별 평균 잔여석</p>
        </header>

        <form
          role="search"
          onSubmit={event => {
            event.preventDefault();
            handlers.submitSearch();
          }}
          className="flex gap-2 px-4 pb-3"
        >
          {/* M버스·G버스 등 영문이 포함된 노선이 있으므로 숫자 전용 입력을 쓰지 않는다. */}
          <input
            id="route-keyword"
            type="search"
            value={state.keyword}
            onChange={event => handlers.changeKeyword(event.target.value)}
            placeholder="버스 번호 (예: 1150, M5107)"
            aria-label="버스 번호"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-xl border border-line-strong bg-subtle px-3.5 py-2.5 text-base text-ink placeholder:text-faint focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button type="submit" className="rounded-xl bg-accent px-5 font-semibold text-accent-ink transition-colors hover:bg-accent-strong">
            검색
          </button>
        </form>

        {/* 검색 중에는 카드 대신 칩으로 최근 본 노선을 보여준다. */}
        {state.submittedKeyword && hasRecentRoutes && (
          <nav aria-label="최근 본 노선" className="flex flex-wrap items-center gap-1.5 px-4 pb-4 text-xs text-muted">
            <span className="mr-0.5">최근 본 노선</span>
            {state.recentRoutes.map(route => (
              <button
                key={route.id}
                type="button"
                title={`${route.startStopName} → ${route.endStopName}`}
                onClick={() => handlers.openRoute(route)}
                className="rounded-full border border-line px-2.5 py-0.5 text-[13px] text-ink hover:border-faint"
              >
                {route.routeName}
              </button>
            ))}
          </nav>
        )}

        <SearchResults
          submittedKeyword={state.submittedKeyword}
          routes={state.routes}
          emptyMessage={state.emptyMessage}
          hasResult={state.hasResult}
          isLoading={state.isLoading}
          hasError={state.hasError}
          onOpenRoute={handlers.openRoute}
        />

        {!state.submittedKeyword && hasRecentRoutes && (
          <RecentRouteCards
            cards={summaries.cards}
            moreRoutes={summaries.moreRoutes}
            conditionLabel={summaries.conditionLabel}
            hour={summaries.hour}
            detailQuery={summaries.detailQuery}
            onRemember={handlers.rememberRoute}
            onOpenRoute={handlers.openRoute}
          />
        )}

        {!state.submittedKeyword && <HomeGuide compact={hasRecentRoutes} onSearchExample={handlers.searchFor} />}

        <div className="mt-auto">
          <ContactSection />
        </div>
      </main>
    </div>
  );
}
