// 잔여석 등급·막대·표기. 홈(미리보기·노선 카드)과 노선 상세가 함께 쓴다.
// 색 클래스 문자열이 있어 tailwind content 스캔 경로(app/) 안에 둔다.

export type SeatLevel = 'plenty' | 'ok' | 'low' | 'crit';

// 등급 경계: 6 / 11 / 15석
export const getSeatLevel = (seats: number): SeatLevel => {
  if (seats >= 15) return 'plenty';
  if (seats >= 11) return 'ok';
  if (seats >= 6) return 'low';
  return 'crit';
};

// 색 클래스는 Tailwind가 스캔할 수 있도록 완성된 문자열로 둔다.
export const SEAT_LEVEL_BG_CLASS: Record<SeatLevel, string> = {
  plenty: 'bg-seat-plenty',
  ok: 'bg-seat-ok',
  low: 'bg-seat-low',
  crit: 'bg-seat-crit',
};

// 글자용 등급색. 노랑(보통)은 밝은 배경에서 글자로 읽기 어려워 본문색을 쓴다.
export const SEAT_LEVEL_TEXT_CLASS: Record<SeatLevel, string> = {
  plenty: 'text-seat-plenty-ink',
  ok: 'text-ink',
  low: 'text-seat-low-ink',
  crit: 'text-seat-crit',
};

export const SEAT_LEVEL_LABEL: Record<SeatLevel, string> = {
  plenty: '여유',
  ok: '보통',
  low: '적음',
  crit: '거의 없음',
};

// 막대 길이 기준 좌석 수 (광역·직행좌석 버스 좌석 수 41~45석 기준)
export const SEAT_SCALE = 45;

// 측정 횟수가 이보다 적으면 신뢰도가 낮은 값으로 표시한다. (G6000 기준 측정 횟수 중앙값 4회)
export const LOW_SAMPLE_THRESHOLD = 3;

// 전광판 요약에서 '좌석이 거의 없다'고 보는 기준
export const LOW_SEAT_THRESHOLD = 6;

export const toSeatRatio = (seats: number) => Math.max(0, Math.min(seats / SEAT_SCALE, 1));

// 소수 첫째 자리까지 표시
export const formatSeats = (seats: number) => (Math.round(seats * 10) / 10).toFixed(1);
