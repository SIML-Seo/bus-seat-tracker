// GA4 측정 ID. layout의 gtag 스크립트와 화면 이동 추적이 같은 값을 쓴다.
export const GA_MEASUREMENT_ID = 'G-V8BPEY011T';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// 현재 주소(쿼리 포함)로 page_view를 보낸다.
// 광고 차단 등으로 gtag가 없으면 건너뛴다. (집계에서 빠질 뿐 화면 동작에는 영향 없음)
export const sendPageView = () => {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', {
    page_location: window.location.href,
    page_title: document.title,
  });
};
