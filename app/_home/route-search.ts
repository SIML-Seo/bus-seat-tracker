// 홈 검색의 순수 함수: 결과 정렬, 최근 본 노선 목록 가공.
import { splitRouteName } from '@/app/_shared/route-display';

export interface RouteSummary {
  id: string;
  routeName: string;
  type: string;
  routeTypeName?: string;
  startStopName: string;
  endStopName: string;
  company?: string;
}

// ---------- 결과 정렬 ----------

// 검색어와의 일치 정도. 0: 번호 일치, 1: 앞자리 일치, 2: 포함
// API는 '포함' 검색이라 '100'을 찾으면 5100, G6100 등이 섞여 오고, 100번이 뒤쪽에 묻힌다.
export const getMatchRank = (routeName: string, keyword: string) => {
  const name = routeName.toLowerCase();
  const target = keyword.trim().toLowerCase();
  const { number } = splitRouteName(name);
  // 심야 변형(G6000N)도 같은 번호로 본다.
  const baseNumber = number.replace(/n$/, '');
  if (name === target || number === target || baseNumber === target) return 0;
  if (name.startsWith(target)) return 1;
  return 2;
};

// 일치 정도 → 번호 길이 → 가나다 순
export const sortRoutesByMatch = <T extends Pick<RouteSummary, 'routeName'>>(routes: T[], keyword: string) =>
  [...routes].sort(
    (a, b) =>
      getMatchRank(a.routeName, keyword) - getMatchRank(b.routeName, keyword) ||
      a.routeName.length - b.routeName.length ||
      a.routeName.localeCompare(b.routeName, 'ko')
  );

// ---------- 최근 본 노선 ----------

export type RecentRoute = Pick<RouteSummary, 'id' | 'routeName' | 'type' | 'startStopName' | 'endStopName'>;

export const RECENT_ROUTES_STORAGE_KEY = 'bus-seat-tracker:recent-routes';
const MAX_RECENT_ROUTES = 5;

// 방금 본 노선을 맨 앞에 두고 중복을 없앤다.
export const addRecentRoute = (list: RecentRoute[], route: RecentRoute): RecentRoute[] =>
  [
    {
      id: route.id,
      routeName: route.routeName,
      type: route.type,
      startStopName: route.startStopName,
      endStopName: route.endStopName,
    },
    ...list.filter(item => item.id !== route.id),
  ].slice(0, MAX_RECENT_ROUTES);

const isRecentRoute = (value: unknown): value is RecentRoute => {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return ['id', 'routeName', 'type', 'startStopName', 'endStopName'].every(key => typeof item[key] === 'string');
};

// 저장값이 깨졌거나 형식이 바뀌어도 화면이 깨지지 않도록 검증 후 사용한다.
export const parseRecentRoutes = (raw: string | null): RecentRoute[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isRecentRoute).slice(0, MAX_RECENT_ROUTES) : [];
  } catch {
    return [];
  }
};
