import Link from 'next/link';
import { SEAT_LEVEL_BG_CLASS, formatSeats, getSeatLevel, toSeatRatio } from '@/app/_shared/seat-level';

// 예시 번호: 영문(M·G) 노선과 숫자 노선을 섞어 '영문도 검색된다'는 것을 보여준다.
// 모두 운영 DB에 정확히 같은 번호가 있는 노선이다. (2026-09-29 확인)
const EXAMPLE_KEYWORDS = ['M5107', 'G6000', '1150', '8100', '3100'];

// 결과 화면 미리보기용 예시 값. 운영 통계 G6000(평안운수) 평일 8시대, 2026-09-29 조회.
// 소개용 정적 값이라 실시간으로 갱신하지 않는다. 누르면 같은 조건의 실제 상세 화면으로 이동한다.
// 잔여석이 30석에서 7.8석까지 줄어드는 구간(9~14번)을 골라 서비스가 보여주는 것을 드러낸다.
const PREVIEW = {
  href: '/bus/207000099?day=weekday&hour=8',
  routeName: 'G6000',
  condition: '평일 · 8시대',
  routeAverage: 23.6,
  direction: '잠실광역환승센터 방면',
  summary: '가장 적은 곳 민락IC 7.8석',
  stops: [
    { seq: 9, name: '송산주공1.9단지', seats: 30.0 },
    { seq: 10, name: '산들마을2단지', seats: 20.2 },
    { seq: 11, name: 'BRT.반도유보라아이비파크후문', seats: 13.6 },
    { seq: 12, name: '양지마을10단지.민락대광로제비앙', seats: 10.5 },
    { seq: 13, name: '송양초등학교.송산3동행정복지센터', seats: 9.1 },
    { seq: 14, name: '민락IC', seats: 7.8 },
  ],
};

const STEPS = [
  '버스 번호로 노선을 찾습니다. M·G버스, 예약·심야 노선도 나옵니다.',
  '요일과 시간대를 고릅니다. 처음에는 지금 시각으로 열립니다.',
  '정류장마다 평균 몇 석이 남는지, 어디서부터 자리가 없는지 봅니다.',
];

interface Props {
  // 최근 본 노선이 있어 다시 찾아온 사람: 미리보기·사용법은 접고 예시 번호만 보여준다.
  compact: boolean;
  onSearchExample: (keyword: string) => void;
}

// 검색 전 홈: 예시 번호, 결과 화면 미리보기, 사용법
export const HomeGuide = ({ compact, onSearchExample }: Props) => (
  <div className="grid gap-5 px-4 pb-6">
    <section aria-labelledby="example-keywords" className="grid gap-2">
      <h2 id="example-keywords" className="text-xs text-muted">
        이런 번호로 찾아보세요
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {EXAMPLE_KEYWORDS.map(keyword => (
          <button
            key={keyword}
            type="button"
            onClick={() => onSearchExample(keyword)}
            className="rounded-full border border-line px-3 py-1 text-[13px] text-ink hover:border-faint"
          >
            {keyword}
          </button>
        ))}
      </div>
    </section>

    {!compact && (
      <>
        <section aria-label="결과 화면 예시">
          <Link
            href={PREVIEW.href}
            aria-label={`예시 노선 ${PREVIEW.routeName} ${PREVIEW.condition} 자세히 보기`}
            className="block overflow-hidden rounded-2xl border border-line hover:border-line-strong"
          >
            <div className="flex items-center justify-between gap-2 border-b border-line bg-subtle px-3 py-2.5 text-xs text-muted">
              <span className="font-semibold text-ink">이렇게 보여드려요</span>
              <span>예시 · G6000 평일 8시</span>
            </div>

            <div className="mx-2.5 mb-1 mt-2.5 grid gap-1.5 rounded-xl bg-led-bg px-3 py-2.5 text-led">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-dot text-xl leading-none tracking-wide">{PREVIEW.routeName}</span>
                <span className="text-xs text-led-dim">{PREVIEW.condition}</span>
                <span className="ml-auto text-xs">
                  노선 평균 <span className="font-dot text-base">{formatSeats(PREVIEW.routeAverage)}</span>석
                </span>
              </div>
              <p className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-2 border-t border-dashed border-led-dim pt-1.5 text-xs">
                <span className="truncate text-led-dim">{PREVIEW.direction}</span>
                <span>{PREVIEW.summary}</span>
              </p>
            </div>

            <ol className="py-1" aria-label="예시 정류장별 평균 잔여석">
              {PREVIEW.stops.map(stop => {
                const level = getSeatLevel(stop.seats);
                return (
                  <li key={stop.seq} className="grid grid-cols-[22px_12px_minmax(0,1fr)_3.6rem] items-center gap-2 py-1.5 pl-1.5 pr-3 text-xs">
                    <span className="text-right font-mono text-[10px] text-muted">{stop.seq}</span>
                    <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border-[2.5px] border-route bg-surface" />
                    <span className="grid min-w-0 gap-1">
                      <span className="truncate text-ink">{stop.name}</span>
                      <span className="h-1.5 overflow-hidden rounded-sm bg-sunken">
                        {/* 막대 길이는 데이터 값이라 정적 클래스로 표현할 수 없어 인라인 스타일을 쓴다. */}
                        <span className={`block h-full ${SEAT_LEVEL_BG_CLASS[level]}`} style={{ width: `${toSeatRatio(stop.seats) * 100}%` }} />
                      </span>
                    </span>
                    <span className="text-right font-mono text-ink">{formatSeats(stop.seats)}석</span>
                  </li>
                );
              })}
            </ol>
            <p className="border-t border-line px-3 py-2 text-right text-xs text-accent">
              이 노선 자세히 보기 →
            </p>
          </Link>
        </section>

        <section aria-labelledby="how-to" className="grid gap-2.5">
          <h2 id="how-to" className="text-xs text-muted">
            이렇게 쓰세요
          </h2>
          <ol className="grid gap-2.5">
            {STEPS.map((step, index) => (
              <li key={step} className="grid grid-cols-[22px_minmax(0,1fr)] gap-2.5 text-[13px] leading-relaxed text-ink-soft">
                <span aria-hidden="true" className="grid h-[22px] w-[22px] place-items-center rounded-full bg-accent-soft font-mono text-xs text-accent">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      </>
    )}
  </div>
);
