# Bus 프로젝트 분석 보고서

> 최초 분석일: 2026-02-03
> 최종 업데이트: 2026-02-04
> 분석 대상: 좌석 버스 잔여석 안내 서비스

---

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **목적** | 경기도 좌석버스 실시간 잔여석 정보 수집 및 시간대별/정류장별 통계 제공 |
| **기술 스택** | Next.js 15, Prisma ORM, PostgreSQL (Supabase), Tailwind CSS |
| **데이터 수집** | 로컬 스크립트 실행 (`npm run collect:bus`) |
| **배포** | Vercel (무료 티어) |
| **관리** | 관리자 대시보드 (`/admin`) |
| **비용** | 0원 (무료 서비스만 활용) |

---

## 아키텍처 분석

### 데이터 수집 방식

두 가지 실행 모드를 지원합니다:

#### 지속 실행 모드 (기본)
- `npm run collect:bus`
- `scripts/collectBusData.ts` → `lib/api/busDataCollector.ts`
- 로컬 PC에서 `setInterval` 기반 지속 실행
- 평일: 집중 그룹 수집 (5주 주기 순환)
- 출퇴근 시간: 3분 간격 / 일반 시간: 18분 간격
- 주말: 모든 그룹 40분 간격
- 일일 API 호출 한도 관리 (10,000건)
- 메모리 기반 중복 데이터 필터링

#### 단일 실행 모드 (GitHub Actions / Cron용)
- `npm run collect:bus -- --single-run`
- `scripts/collectBusData.ts` → `lib/api/busDataService.ts`
- 1회 실행 후 종료
- DB 기반 중복 데이터 필터링 (동일 버스 + 동일 정류장 + 10분 이내 + 좌석 변동 ≤2)
- 정류장 정보 없는 노선 자동 조회 및 저장

### 관리자 시스템
- `/admin` 대시보드: 통계, 커버리지, 스토리지, 시스템 상태, 로그 조회
- 토큰 기반 인증 (`lib/utils/adminAuth.ts`)
- 데이터 정리/초기화 기능 (BusStopSeats 초기화, 전체 초기화)
- 전체 초기화 시 비밀번호 재확인 필수

### 자동 복구
- 전체 초기화 후 스크립트 실행 시 BusRoute가 비어있으면 자동으로 `collectAllSeatBusRoutes()` 호출
- 두 실행 모드 모두 동일하게 적용

### 장점
- 비용 완전 무료
- API 호출 한도 세밀하게 관리
- 출퇴근 시간 집중 수집으로 데이터 품질 향상
- 공휴일 자동 감지 및 수집 중단
- 관리자 대시보드를 통한 데이터 관리
- 전체 초기화 후 자동 복구

### 단점
- 컴퓨터 24시간 가동 필요
- 컴퓨터 꺼지면 수집 중단
- 전기세 발생

---

## 해결된 문제점

> 아래 항목들은 2026-02-03 ~ 02-04 사이에 모두 수정 완료되었습니다.

### 보안 (Critical) — 모두 해결됨

| 문제 | 해결 방법 |
|------|----------|
| CRON API 인증 우회 가능 (`CRON_SECRET` 빈 문자열이면 인증 건너뜀) | 프로덕션에서 `CRON_SECRET` 필수, 항상 인증 검증 |
| Debug API 프로덕션 노출 | `middleware.ts` 추가 — 프로덕션에서 `/api/debug`, `/debug` 경로 404 반환 |
| 에러 상세 정보 클라이언트 노출 | `errorHandler.ts` 추가 — 프로덕션에서 일반화된 메시지만 반환 |
| Contact API 입력 검증 부족 | 이름 100자, 이메일 254자, 메시지 5000자 길이 제한 + trim 처리 추가 |

### 코드 품질 (Major) — 모두 해결됨

| 문제 | 해결 방법 |
|------|----------|
| 과도한 DEBUG 로그 (항상 실행) | `debugLog()` 함수로 통합, `DEBUG=true/1` 일 때만 실행 |
| TypeScript `strict: true` + `noImplicitAny: false` 모순 | `noImplicitAny: true`로 변경, 관련 타입 오류 수정 |
| 로거 `debug/warn/error` 메서드 코드 중복 | `writeLog()` 공통 함수로 추출, 로그 레벨별 `console` 메서드 분리 |
| Prisma 싱글톤 프로덕션 미적용 | 조건 제거, 항상 글로벌에 할당 |

---

## 남아있는 개선사항

### 아키텍처/설계 (Moderate)

#### N+1 쿼리 패턴
**위치**: `app/api/buses/route.ts:36-50`

```typescript
const routeDetails = await Promise.all(
  routesFromApi.map(async (route) => {
    const detailInfo = await fetchRouteDetail(route.routeId);  // 각 노선마다 API 호출
  })
);
```

10개 노선 검색 시 11번의 API 호출 발생

**권장**: `createMany` 사용
```typescript
await prisma.busStop.createMany({
  data: stops.map(stop => ({...})),
  skipDuplicates: true
});
```

#### 트랜잭션 미사용
**위치**: `app/api/buses/route.ts:53-99`

여러 create 작업이 트랜잭션 없이 실행됨

**권장**: Prisma `$transaction` 사용

### 기타 (Minor)

#### 하드코딩된 값들

| 파일 | 값 | 권장 |
|------|-----|------|
| `publicDataApi.ts` | `SEAT_BUS_TYPE_CODES = [11, 12, 14, 16, 17, 21, 22]` | 환경변수 또는 설정 파일 |
| `busDataCollector.ts` | 운영 시간 `6~22시` | 환경변수 |
| `page.tsx` | 개발자 이메일 | 환경변수 |

#### 로깅 시스템의 서버리스 환경 부적합
**위치**: `lib/logging/logger.ts`

- 로컬 파일 시스템에 저장 시도
- Vercel 등 서버리스 환경에서는 로컬 파일 유지 불가
- **현재 상황**: 로컬 스크립트 실행이므로 문제없음

---

## 비용 분석

### 현재 비용 구조: 0원

| 서비스 | 사용량 | 비용 |
|--------|--------|------|
| Supabase | 무료 티어 (500MB DB) | 0원 |
| Vercel | 무료 티어 | 0원 |
| 공공데이터 API | 무료 (일 10,000건) | 0원 |
| 로컬 실행 | 전기세 | ~월 몇천원 추정 |

### 무료 대안 (컴퓨터 안 켜고 싶을 때)

| 서비스 | 무료 한도 | 적합성 |
|--------|-----------|--------|
| GitHub Actions | 월 2,000분 (Private) / 무제한 (Public) | 수집 빈도에 따라 초과 가능 |
| Oracle Cloud Free Tier | ARM A1 4 OCPU, 24GB RAM (Always Free) | 24/7 실행 적합, A1 인스턴스 용량 부족 자주 발생 |
| Render.com | 무료 cron job | 적합 |
| fly.io | 256MB RAM 무료 | 소규모 서버 적합 |

> GitHub Actions는 현재 수집 스케줄 기준 월 ~3,552분 소요 예상으로, Private 리포 무료 티어(2,000분)를 초과합니다. Public 리포로 전환하거나 수집 빈도를 줄여야 합니다.

---

## 프로젝트 구조

### 주요 파일

```
bus/
├── app/
│   ├── admin/page.tsx              # 관리자 대시보드
│   ├── api/
│   │   ├── admin/                  # 관리자 API (stats, coverage, storage, system, logs, cleanup)
│   │   ├── cron/collect-bus-data/  # Cron 엔드포인트 (단일 실행)
│   │   ├── buses/                  # 버스 노선/좌석 API
│   │   └── contact/               # 문의하기 API
│   └── bus/[id]/page.tsx           # 버스 상세 페이지
├── lib/
│   ├── api/
│   │   ├── busDataCollector.ts     # 데이터 수집 (지속 실행 모드)
│   │   ├── busDataService.ts       # 데이터 수집 (단일 실행 모드)
│   │   └── publicDataApi.ts        # 공공데이터 API 호출
│   ├── logging/logger.ts           # 로그 매니저 (로컬 + Supabase Storage)
│   ├── prisma/client.ts            # Prisma 클라이언트 (싱글톤)
│   └── utils/
│       ├── adminAuth.ts            # 관리자 인증 (HMAC 토큰)
│       └── errorHandler.ts         # 에러 응답 생성 유틸리티
├── middleware.ts                   # 프로덕션 디버그 경로 차단
├── scripts/
│   ├── collectBusData.ts           # 수집 스크립트 (지속/단일 모드 지원)
│   └── cleanupStorage.ts           # 스토리지 정리 스크립트
└── .github/workflows/
    └── collect-bus-data.yml        # GitHub Actions 워크플로우
```

---

## 결론

프로젝트는 전체적으로 잘 구현되어 있으며, 초기 분석에서 발견된 보안/코드 품질 문제는 모두 해결되었습니다.

핵심 강점:
- 출퇴근 시간 집중 수집 로직
- API 호출 한도 체계적 관리
- 공휴일 자동 감지
- 관리자 대시보드를 통한 데이터/로그 관리
- 전체 초기화 후 자동 복구 메커니즘
- 비용 0원 운영

남은 개선사항은 성능 최적화(N+1 쿼리, 트랜잭션) 수준이며, 현재 규모에서는 큰 영향이 없습니다.
