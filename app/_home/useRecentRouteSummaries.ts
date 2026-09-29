import { useState } from 'react';
import useSWR from 'swr';
import { buildConditionQuery, describeCondition, getDefaultCondition } from '@/app/bus/[id]/_lib/bus-detail';
import type { RouteSummaryResponse } from '@/app/_shared/route-summary';
import type { RecentRoute } from './route-search';

// 카드로 보여줄 최근 본 노선 수. 나머지는 칩으로 보여준다.
export const MAX_SUMMARY_CARDS = 3;

// 노선 하나가 실패해도 나머지 카드는 보이도록 개별 실패는 null로 둔다.
const fetchSummary = async (url: string): Promise<RouteSummaryResponse | null> => {
  try {
    const res = await fetch(url);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
};

const fetchSummaries = ([, ids, query]: [string, string, string]) =>
  Promise.all(ids.split(',').map(id => fetchSummary(`/api/buses/${id}/summary${query}`)));

export interface SummaryCard {
  route: RecentRoute;
  summary: RouteSummaryResponse | null;
  isLoading: boolean;
}

// 최근 본 노선의 '지금 기준' 요약 (서울 시간 기준 오늘 요일 묶음 + 현재 시간대)
export const useRecentRouteSummaries = (recentRoutes: RecentRoute[]) => {
  // 페이지를 연 시점의 조건으로 고정한다. (보는 도중 시간이 바뀌어도 카드가 갑자기 바뀌지 않게)
  const [condition] = useState(() => getDefaultCondition());
  const cardRoutes = recentRoutes.slice(0, MAX_SUMMARY_CARDS);
  // 요약 API는 day/hour만 받는다. (정류장 선택은 쓰지 않음)
  const query = buildConditionQuery({ ...condition, openStop: null });

  const { data, isLoading } = useSWR(
    cardRoutes.length > 0 ? ['route-summaries', cardRoutes.map(route => route.id).join(','), query] : null,
    fetchSummaries,
    // 같은 조건의 요약은 서버에서 1시간 캐시하므로 창 포커스마다 다시 받을 필요가 없다.
    { revalidateOnFocus: false }
  );

  const cards: SummaryCard[] = cardRoutes.map((route, index) => ({
    route,
    summary: data?.[index] ?? null,
    isLoading,
  }));

  return {
    cards,
    moreRoutes: recentRoutes.slice(MAX_SUMMARY_CARDS),
    conditionLabel: describeCondition(condition.dayGroup, condition.hour),
    hour: condition.hour,
    detailQuery: query,
  };
};
