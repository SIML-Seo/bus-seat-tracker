import { RouteBadge, RouteTag, StationName, splitRouteName } from '@/app/_shared/route-display';
import type { RouteSummary } from './route-search';

interface Props {
  submittedKeyword: string;
  routes: RouteSummary[];
  emptyMessage?: string;
  hasResult: boolean;
  isLoading: boolean;
  hasError: boolean;
  onOpenRoute: (route: RouteSummary) => void;
}

// 검색 중 스켈레톤: 결과 행과 같은 틀로 자리를 잡아 결과가 왔을 때 화면이 튀지 않게 한다.
const ResultSkeleton = () => (
  <ul aria-hidden="true" className="divide-y divide-line">
    {[0, 1, 2].map(index => (
      <li key={index} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 px-4 py-3">
        <span className="row-span-2 h-6 w-16 animate-pulse rounded-md bg-line" />
        <span className="h-4 w-3/4 animate-pulse rounded bg-line" />
        <span className="h-3 w-1/3 animate-pulse rounded bg-sunken" />
      </li>
    ))}
  </ul>
);

export const SearchResults = ({ submittedKeyword, routes, emptyMessage, hasResult, isLoading, hasError, onOpenRoute }: Props) => {
  if (!submittedKeyword) return null;

  return (
    <section aria-label="검색 결과" aria-busy={isLoading}>
      <div className="flex justify-between gap-2 border-y border-line bg-subtle px-4 py-2 text-xs text-muted">
        <span>
          &lsquo;{submittedKeyword}&rsquo; {isLoading ? '검색 중…' : hasResult ? `${routes.length}개 노선` : ''}
        </span>
        {routes.length > 1 && <span>번호가 같은 노선 먼저</span>}
      </div>

      {isLoading && <ResultSkeleton />}

      {hasError && (
        <p role="alert" className="px-4 py-6 text-sm text-danger">
          검색하지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      )}

      {!isLoading && !hasError && hasResult && routes.length === 0 && (
        <p className="px-4 py-6 text-sm text-muted">
          {emptyMessage || '검색 결과가 없습니다. 다른 버스 번호를 검색해보세요.'}
        </p>
      )}

      {!isLoading && routes.length > 0 && (
        <ul className="divide-y divide-line">
          {routes.map(route => {
            const { number, tag } = splitRouteName(route.routeName);
            return (
              <li key={route.id}>
                <button
                  type="button"
                  onClick={() => onOpenRoute(route)}
                  className="grid w-full grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-subtle"
                >
                  <RouteBadge routeName={number} type={route.type} className="row-span-2 self-start" />
                  <span className="text-sm text-ink [overflow-wrap:anywhere]">
                    <StationName name={route.startStopName} /> → <StationName name={route.endStopName} />
                    {tag && <RouteTag>{tag}</RouteTag>}
                  </span>
                  <span className="text-xs text-muted">
                    {[route.company, route.routeTypeName].filter(Boolean).join(' · ')}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
