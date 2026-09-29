import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { sendPageView } from './analytics';

// 화면 이동(pathname 변경) 때만 GA4 page_view를 보낸다.
// 상세 화면은 요일·시간·정류장 조건을 replaceState로 주소 쿼리에 남기는데,
// GA4 향상된 측정의 '브라우저 기록 이벤트 기반 페이지 변경'은 replaceState도 조회로 세어 조건을 누를 때마다 page_view가 쌓인다.
// 그래서 GA4 관리 화면에서 그 옵션을 끈 상태를 전제로, 화면 이동만 여기서 직접 보낸다. (옵션이 켜져 있으면 이동이 두 번 집계됨)
// 첫 로드는 layout의 gtag('config')가 보내므로 건너뛴다.
export const usePageViewTracking = () => {
  const pathname = usePathname();
  const lastPathname = useRef(pathname);

  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    sendPageView();
  }, [pathname]);
};
