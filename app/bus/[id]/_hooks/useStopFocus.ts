import { useEffect, useRef, useState } from 'react';
import { getStopRowId } from '../_lib/bus-detail';

// 이동한 정류장 행을 강조해 두는 시간 (긴 부드러운 스크롤이 끝난 뒤에도 보이도록 넉넉히)
const HIGHLIGHT_MS = 3000;
// 화면 위에 붙은 조건 바와 정류장 행 사이 여백
const SCROLL_GAP_PX = 8;

// 검색으로 고른 정류장 행으로 스크롤하고 잠시 강조한다.
// stickyRef를 화면 위에 붙는 영역에 달면 그 높이만큼 덜 스크롤해 행이 가려지지 않는다.
export const useStopFocus = () => {
  const stickyRef = useRef<HTMLDivElement>(null);
  // 같은 정류장을 다시 골라도 스크롤하도록 매번 새 객체로 바꾼다.
  const [focused, setFocused] = useState<{ stopKey: string } | null>(null);

  // 정류장을 펼친 결과가 화면에 반영된 뒤 위치를 재야 하므로 effect에서 스크롤한다.
  useEffect(() => {
    if (!focused) return;

    const row = document.getElementById(getStopRowId(focused.stopKey));
    if (row) {
      const offset = (stickyRef.current?.offsetHeight ?? 0) + SCROLL_GAP_PX;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({
        top: row.getBoundingClientRect().top + window.scrollY - offset,
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    }

    const timer = window.setTimeout(() => setFocused(null), HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [focused]);

  return {
    stickyRef,
    highlightedStop: focused?.stopKey ?? null,
    focusStop: (stopKey: string) => setFocused({ stopKey }),
  };
};
