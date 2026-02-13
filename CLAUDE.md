# CLAUDE.md - Bus Seats Tracker Project

## Project Overview

경기도 좌석 버스의 시간대별/정류장별 잔여석 통계를 제공하는 웹 서비스.
공공데이터포털 API를 통해 주기적으로 버스 위치 및 잔여석 데이터를 수집하여 평균 잔여석 통계를 제공한다.

- **Production URL**: https://busseatstracker.vercel.app
- **Deployment**: Vercel

## Tech Stack

- **Framework**: Next.js 15.1.11 (App Router)
- **Language**: TypeScript 5 (strict mode, `noImplicitAny` enabled)
- **UI**: React 19, Tailwind CSS 3.4
- **Database**: PostgreSQL (Supabase) via Prisma 6.4
- **Data Fetching**: SWR (client), Axios (server)
- **Logging**: Custom LogManager (local file + Supabase Storage)
- **Notifications**: Slack Webhook
- **Analytics**: Google Analytics (G-V8BPEY011T)
- **Fonts**: Geist Sans, Geist Mono

## Commands

```bash
npm run dev            # 개발 서버 실행
npm run build          # 프로덕션 빌드 (prisma generate 포함)
npm run start          # 프로덕션 서버 실행
npm run lint           # ESLint 검사

# 데이터 수집
npm run collect:bus                        # 지속 실행 모드 (로컬)
npx tsx scripts/collectBusData.ts --single-run  # 단일 실행 모드 (CI/CD)

# 유틸리티
npm run cleanup        # 오래된 스토리지 데이터 정리
npm run db:status      # DB 테이블별 레코드 수 확인
```

## Directory Structure

```
bus/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # 루트 레이아웃 (GA, 폰트)
│   ├── page.tsx                # 홈 - 버스 노선 검색
│   ├── globals.css             # 글로벌 스타일
│   ├── sitemap.ts              # 동적 사이트맵
│   ├── bus/[id]/page.tsx       # 버스 상세 - 노선도 + 잔여석 통계
│   ├── admin/page.tsx          # 관리자 대시보드
│   ├── debug/                  # 디버그 페이지 (production 차단)
│   └── api/
│       ├── buses/              # 버스 노선 검색 및 좌석 데이터
│       ├── cron/               # Vercel Cron 데이터 수집
│       ├── contact/            # 문의 접수
│       ├── admin/              # 관리자 API (인증, 통계, 로그 등)
│       └── debug*/             # 디버그 API (production 차단)
├── lib/                        # 공유 라이브러리
│   ├── api/
│   │   ├── types.ts            # 공공데이터 API 응답 타입
│   │   ├── publicDataApi.ts    # 경기도 버스 API 클라이언트
│   │   ├── busDataCollector.ts # 지속 실행 데이터 수집 로직
│   │   ├── busDataService.ts   # 단일 실행 데이터 수집 (Cron용)
│   │   ├── cronCollector.ts    # Vercel Cron 최적화 수집기
│   │   └── apiDebug.ts         # API 키 디버깅
│   ├── prisma/client.ts        # Prisma 싱글톤 클라이언트
│   ├── supabase/client.ts      # Supabase 클라이언트 (일반 + Admin)
│   ├── logging/                # 로그 매니저 (파일 + Supabase Storage)
│   ├── slack/notifications.ts  # Slack 알림 (문의 접수 시)
│   └── utils/
│       ├── adminAuth.ts        # 관리자 토큰 인증 (HMAC-SHA256)
│       ├── errorHandler.ts     # API 에러 응답 헬퍼
│       └── debugger.ts         # 디버그 유틸리티
├── prisma/
│   └── schema.prisma           # DB 스키마
├── scripts/
│   ├── collectBusData.ts       # 데이터 수집 CLI 스크립트
│   └── cleanupStorage.ts       # 스토리지 정리 스크립트
├── middleware.ts               # 프로덕션에서 디버그 경로 차단
└── docs/                       # 프로젝트 문서
```

## Database Schema (Prisma + PostgreSQL)

| Model | Description | Key Fields |
|-------|-------------|------------|
| **BusRoute** | 버스 노선 정보 | id (PK), routeName, type, startStopName, endStopName, turnStationId |
| **BusStop** | 정류장 정보 | busRouteId+stationId (복합 PK), stationName, stationSeq, x, y |
| **BusLocation** | 버스 위치 (주기적 수집) | busRouteId, busId, stopId, remainingSeats, updatedAt |
| **BusStopSeats** | 정류장별 잔여석 통계 | busRouteId+stopId+dayOfWeek+hourOfDay (unique), averageSeats, samplesCount |
| **Contact** | 사용자 문의 | name, email, message, read |

## API Endpoints

### Public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/buses?keyword=` | 버스 노선 검색 (DB 우선, dev에서만 API fallback) |
| GET | `/api/buses/[id]/stops` | 노선 정류장 목록 |
| GET | `/api/buses/[id]/seats?dayOfWeek=&hourOfDay=&stopId=` | 잔여석 통계 (다중 요일 필터 지원) |
| POST | `/api/contact` | 문의 접수 (Slack 알림 전송) |

### Cron
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cron/collect-bus-data` | 데이터 수집 (CRON_SECRET 인증) |

### Admin (Bearer 토큰 인증)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/auth` | 관리자 로그인 (ADMIN_PASSWORD) |
| GET | `/api/admin/stats` | DB 통계 |
| GET | `/api/admin/logs` | 로그 조회 |
| GET | `/api/admin/storage` | 스토리지 관리 |
| GET | `/api/admin/system` | 시스템 정보 |
| GET | `/api/admin/coverage` | 데이터 커버리지 |
| DELETE | `/api/admin/cleanup` | 데이터 정리 |

## Environment Variables

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=               # Prisma 연결 URL (pooling)
DIRECT_URL=                 # 직접 연결 URL (마이그레이션용)

# Supabase
SUPABASE_URL=               # Supabase 프로젝트 URL
SUPABASE_KEY=               # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=  # Supabase service role key (로깅용)

# Public Data API
PUBLIC_DATA_API_KEY=        # 공공데이터포털 API 키 (인코딩)
# 또는 PUBLIC_DATA_BUS_API_KEY_DEC= (디코딩 버전)

# Authentication
CRON_SECRET=                # Cron 작업 인증 키
ADMIN_PASSWORD=             # 관리자 페이지 비밀번호

# Notifications
SLACK_WEBHOOK_URL=          # Slack 문의 알림 Webhook URL

# Debug
DEBUG=                      # 'true' 또는 '1'로 설정 시 디버그 모드
```

## Architecture & Data Flow

### Data Collection Strategy
- **운영 시간**: 06:00~22:00 (그 외 시간은 수집 중단)
- **출퇴근 시간** (07:00-09:00, 17:30-19:30): 3분 간격
- **일반 시간대**: 18분 간격
- **주말**: 40분 간격, 모든 그룹 수집
- **공휴일**: 수집 중단 (공공데이터포털 공휴일 API 확인)

### Route Grouping (5-Group Rotation)
노선을 ID 끝자리 기준으로 5개 그룹으로 나눠 평일에는 하루 1개 그룹만 집중 수집:
- group1_6: 끝자리 1, 6
- group2_7: 끝자리 2, 7
- group3_8: 끝자리 3, 8
- group4_9: 끝자리 4, 9
- group5_0: 끝자리 5, 0
5주 주기로 순환하며, 25일이면 모든 노선이 한 번씩 집중 수집됨.

### Data Retention
- **24시간 이상**: 완전 삭제
- **12~24시간**: 80% 삭제 (샘플링 보존)
- **BusStopSeats 통계**: 영구 보관 (가중 평균으로 누적 업데이트)

### Deduplication
동일 버스가 같은 정류장에서 10분 이내에 잔여석 변동이 2석 이하이면 중복으로 간주하여 저장하지 않음.

## Coding Conventions

- **Language**: 한국어 주석 사용
- **Path Aliases**: `@/*` -> 프로젝트 루트 (`./`)
- **ESLint**: `next/core-web-vitals` + `next/typescript` 확장
- **TypeScript**: strict 모드, `noImplicitAny` 활성화
- **Prisma**: 싱글톤 패턴 (`globalForPrisma`)
- **Error Handling**: `createErrorResponse()` 헬퍼 사용, 프로덕션에서는 상세 에러 숨김
- **Logging**: `logger.info/warn/error()` 사용 (console.log 대신)
- **API 응답**: `NextResponse.json()` 사용
- **Client Components**: `'use client'` 지시자 명시
- **Data Fetching**: 클라이언트 측은 SWR, 서버 측은 직접 Prisma 호출
- **Vercel Config**: cron 함수에 1024MB 메모리 할당

## External APIs

### 경기도 버스 API (공공데이터포털)
- Base URL: `http://apis.data.go.kr/6410000`
- 노선 목록: `/busrouteservice/v2/getBusRouteListv2`
- 노선 상세: `/busrouteservice/v2/getBusRouteInfoItemv2`
- 버스 위치: `/buslocationservice/v2/getBusLocationListv2`
- 정류장 목록: `/busrouteservice/v2/getBusRouteStationListv2`
- 정류장 정보: `/busstationservice/v2/busStationInfov2`
- 도착 정보: `/busarrivalservice/v2/getBusArrivalListv2`
- 기본 정보: `/baseinfoservice/v2/getBaseInfoItemv2`

### 공휴일 API (공공데이터포털)
- Endpoint: `http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo`

### 좌석버스 타입코드 (잔여석 정보 제공 유형)
`[11, 12, 14, 16, 17, 21, 22]`
- 11: 직행좌석형시내버스, 12: 좌석형시내버스, 14: 광역급행형시내버스
- 16: 경기순환버스, 17: 준공영제직행좌석시내버스
- 21: 직행좌석형농어촌버스, 22: 좌석형농어촌버스

## Key Implementation Notes

1. **Dev vs Production 차이**: 개발 환경에서만 공공 API fallback 호출, 프로덕션에서는 DB 데이터만 반환
2. **Middleware**: 프로덕션에서 `/api/debug*`, `/debug*` 경로를 404로 차단
3. **Admin 인증**: HMAC-SHA256 기반 자체 토큰 시스템 (24시간 유효)
4. **일일 API 호출 제한**: 10,000회 이내로 관리 (dailyApiCallCount 카운터)
5. **배치 처리**: 통계 업데이트 시 20개씩 배치 처리 (Promise.allSettled)
6. **이상치 제거**: 샘플 10개 이상일 때 상위/하위 10% 제거 후 평균 계산
7. **캐시 관리**: 버스 위치 캐시 2시간마다 정리, 날짜 변경 시 전체 초기화
