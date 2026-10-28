// 공개 조회 API의 Vercel CDN 캐시 정책 (Cache-Control 헤더 값)
// s-maxage 동안은 CDN에 저장해 둔 응답을 그대로 준다. 그 뒤 stale-while-revalidate 동안은
// 이전 응답을 바로 주고 뒤에서 새로 받아오므로, 대부분의 요청이 DB 조회를 기다리지 않는다.

// 잔여석 통계: 누적 평균이라 천천히 변하므로 1시간 동안 그대로 쓰고, 하루 동안은 이전 결과를 먼저 보여준다.
export const STATS_CACHE_CONTROL = 's-maxage=3600, stale-while-revalidate=86400';

// 노선·정류장 정보: 거의 바뀌지 않으므로 하루 동안 그대로 쓰고, 일주일 동안은 이전 결과를 먼저 보여준다.
export const ROUTE_INFO_CACHE_CONTROL = 's-maxage=86400, stale-while-revalidate=604800';
