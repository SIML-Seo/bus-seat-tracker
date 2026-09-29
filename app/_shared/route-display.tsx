// 홈·노선 상세가 함께 쓰는 노선/정류장 표기.
// Tailwind 클래스 문자열을 반환하므로 tailwind content 스캔 경로(app/) 안에 둔다.
// '_' 접두 폴더는 Next.js 라우트로 잡히지 않는다.

// 정류장명 끝의 (경유)/(미정차)/(중)/(예약)을 태그로 분리한다.
export const splitStationName = (name: string) => {
  const match = name.match(/^(.*?)\((경유|미정차|중|예약)\)$/);
  return match ? { base: match[1], tag: match[2] } : { base: name, tag: null };
};

// 노선명 끝의 운행 형태 표기를 태그로 분리한다. 예: 'G6000(예약)' → G6000 + 예약
export const splitRouteName = (name: string) => {
  const match = name.match(/^(.*?)\((예약|출근|퇴근)\)$/);
  return match ? { number: match[1], tag: match[2] } : { number: name, tag: null };
};

// 노선 유형 배지 색: 좌석형(12, 22)은 강조색(파랑), 그 외 직행좌석·광역은 빨강. 빨강 배지 글자는 두 테마 모두 흰색.
export const getRouteBadgeClass = (type: string) =>
  type === '12' || type === '22' ? 'bg-accent text-accent-ink' : 'bg-route text-white';

const Tag = ({ children }: { children: React.ReactNode }) => (
  <em className="ml-1 inline-block rounded border border-line bg-subtle px-1 py-[3px] align-[2px] text-[11px] not-italic leading-none text-muted">
    {children}
  </em>
);

// 정류장명: 이름을 먼저 읽히게 하고 (경유) 등은 작은 태그로 붙인다.
export const StationName = ({ name }: { name: string }) => {
  const { base, tag } = splitStationName(name);
  return (
    <>
      {base}
      {tag && <Tag>{tag}</Tag>}
    </>
  );
};

// 노선 번호 배지 (버스 앞면 번호판처럼 유형 색으로 칠한다)
export const RouteBadge = ({ routeName, type, className = '' }: { routeName: string; type: string; className?: string }) => (
  <span
    className={`inline-flex min-w-16 items-center justify-center rounded-md px-2.5 py-0.5 text-[15px] font-bold tabular-nums ${getRouteBadgeClass(type)} ${className}`}
  >
    {routeName}
  </span>
);

export const RouteTag = Tag;
