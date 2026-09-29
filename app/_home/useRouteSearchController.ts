import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  RECENT_ROUTES_STORAGE_KEY,
  addRecentRoute,
  parseRecentRoutes,
  sortRoutesByMatch,
  type RecentRoute,
  type RouteSummary,
} from './route-search';

interface SearchResponse {
  busRoutes?: RouteSummary[];
  message?: string;
}

// 서버 오류(5xx)도 SWR error로 넘겨 화면에서 오류 상태를 보여준다.
const fetcher = async (url: string): Promise<SearchResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`노선 검색 실패 (${res.status})`);
  return res.json();
};

// localStorage는 비공개 창·저장 차단 환경에서 예외를 던질 수 있다. 최근 본 노선은 편의 기능이므로 실패해도 무시한다.
const readRecentRoutes = () => {
  try {
    return parseRecentRoutes(window.localStorage.getItem(RECENT_ROUTES_STORAGE_KEY));
  } catch {
    return [];
  }
};

const writeRecentRoutes = (routes: RecentRoute[]) => {
  try {
    window.localStorage.setItem(RECENT_ROUTES_STORAGE_KEY, JSON.stringify(routes));
  } catch {
    // 저장하지 못해도 이동은 계속한다.
  }
};

export const useRouteSearchController = () => {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  // 검색 버튼/Enter로 확정된 검색어. 입력 중에는 요청을 보내지 않기 위해 입력값과 분리한다.
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [recentRoutes, setRecentRoutes] = useState<RecentRoute[]>([]);

  // localStorage는 브라우저에만 있으므로 마운트 후에 읽는다. (서버 렌더 결과와 어긋나지 않게)
  useEffect(() => {
    setRecentRoutes(readRecentRoutes());
  }, []);

  const { data, error, isLoading } = useSWR<SearchResponse>(
    submittedKeyword ? `/api/buses?keyword=${encodeURIComponent(submittedKeyword)}` : null,
    fetcher
  );

  const submitSearch = () => {
    const trimmed = keyword.trim();
    if (trimmed) setSubmittedKeyword(trimmed);
  };

  // 예시 번호 칩: 입력칸을 채우고 바로 검색한다.
  const searchFor = (exampleKeyword: string) => {
    setKeyword(exampleKeyword);
    setSubmittedKeyword(exampleKeyword);
  };

  // 최근 본 노선 맨 앞에 기록한다. (링크로 이동하는 카드는 이것만 호출한다)
  const rememberRoute = (route: RecentRoute) => {
    const next = addRecentRoute(recentRoutes, route);
    setRecentRoutes(next);
    writeRecentRoutes(next);
  };

  const openRoute = (route: RecentRoute) => {
    rememberRoute(route);
    router.push(`/bus/${route.id}`);
  };

  return {
    state: {
      keyword,
      submittedKeyword,
      routes: data?.busRoutes ? sortRoutesByMatch(data.busRoutes, submittedKeyword) : [],
      emptyMessage: data?.message,
      hasResult: data !== undefined,
      isLoading,
      hasError: error !== undefined,
      recentRoutes,
    },
    handlers: {
      changeKeyword: setKeyword,
      submitSearch,
      searchFor,
      rememberRoute,
      openRoute,
    },
  };
};
