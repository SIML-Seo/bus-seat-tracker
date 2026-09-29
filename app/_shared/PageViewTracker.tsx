'use client';

import { usePageViewTracking } from './usePageViewTracking';

// 서버 컴포넌트인 layout에서 화면 이동 추적 훅을 쓰기 위한 빈 클라이언트 컴포넌트
export const PageViewTracker = () => {
  usePageViewTracking();
  return null;
};
