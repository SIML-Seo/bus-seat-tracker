# 좌석 버스 잔여석 안내 서비스

대한민국 경기도 버스의 실시간 잔여석 정보를 수집하고 시간대별, 정류장별 통계를 제공하는 웹 서비스입니다.

## 주요 기능

- 버스 번호로 노선 검색
- 시간대별/정류장별 평균 잔여석 정보 제공
- 요일 및 시간 필터링 (평일/주말/요일별)
- 상행/하행 노선 분리 표시
- 출퇴근 시간 집중 수집 (3분 간격)
- 공휴일 자동 감지 및 수집 중단
- 관리자 대시보드 (통계, 커버리지, 스토리지, 로그 조회, 데이터 초기화)

## 기술 스택

### 프론트엔드
- Next.js 15 (App Router)
- Tailwind CSS

### 백엔드
- Next.js API Routes
- Prisma ORM
- PostgreSQL (Supabase)

### 데이터 수집
- 공공데이터포털 API (경기도 버스 노선/위치/좌석 정보)
- 지속 실행 모드: 로컬 PC에서 `setInterval` 기반 수집
- 단일 실행 모드: GitHub Actions / Cron 연동

### 배포
- Vercel (무료 티어)

## 문서

프로젝트 설정 및 사용 가이드는 [docs](./docs) 폴더에서 확인할 수 있습니다:

- [프로젝트 분석 보고서](./docs/PROJECT_ANALYSIS.md)
- [GitHub Actions 설정 가이드](./docs/GITHUB_ACTIONS_SETUP.md)
- [Supabase 용량 관리 가이드](./docs/STORAGE_MANAGEMENT.md)

## 설치 방법

### 필수 요구사항
- Node.js 18 이상
- Supabase 계정
- 공공데이터포털 API 키

### 설치 단계

1. 저장소 클론
```bash
git clone https://github.com/Wonho-SIML/bus-seat-tracker.git
cd bus-seat-tracker
```

2. 패키지 설치
```bash
npm install
```

3. 환경 설정

`.env` 파일을 생성하고 다음 내용 추가:
```
# 데이터베이스
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres"

# Supabase
SUPABASE_URL="https://[YOUR-PROJECT-ID].supabase.co"
SUPABASE_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# 공공데이터 API
PUBLIC_DATA_API_KEY="your-api-key-here"

# 관리자
ADMIN_PASSWORD="your-admin-password"

# Cron API 인증 (선택사항)
CRON_SECRET="your-cron-secret"

# 디버그 (선택사항)
DEBUG="false"
```

4. 데이터베이스 마이그레이션
```bash
npx prisma migrate dev --name init
```

5. 개발 서버 실행
```bash
npm run dev
```

## 데이터 수집

### 지속 실행 모드 (로컬 개발용)
```bash
npm run collect:bus
```
- 로컬 PC에서 무한 실행
- 출퇴근 시간 3분 / 일반 시간 18분 / 주말 40분 간격 수집
- 노선 데이터가 없으면 자동으로 수집

### 단일 실행 모드 (GitHub Actions / Cron용)
```bash
npm run collect:bus -- --single-run
```
- 1회 실행 후 종료
- DB 기반 중복 데이터 필터링

### 유틸리티 스크립트
```bash
# DB 상태 확인
npm run db:status

# 스토리지 정리
npm run cleanup
```

## 관리자 대시보드

`/admin` 경로로 접속합니다. `ADMIN_PASSWORD` 환경변수 설정이 필요합니다.

- 수집 통계 (노선 수, 정류장 수, 위치 데이터 수, 좌석 통계 수)
- 데이터 커버리지 (노선별 커버리지율)
- 스토리지 관리 (데이터 정리, BusStopSeats 초기화, 전체 초기화)
- 시스템 상태 (환경 변수, DB 연결, Prisma 상태)
- 로그 조회 (레벨/키워드 필터링)

## 배포 방법 (Vercel)

1. Vercel 계정 생성 및 GitHub 연결

2. Vercel에 환경 변수 설정:
   - `DATABASE_URL`: Supabase 데이터베이스 연결 문자열
   - `DIRECT_URL`: Supabase 직접 연결 문자열
   - `SUPABASE_URL`: Supabase 프로젝트 URL
   - `SUPABASE_KEY`: Supabase API 키
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase 서비스 롤 키
   - `PUBLIC_DATA_API_KEY`: 공공데이터포털 API 키
   - `ADMIN_PASSWORD`: 관리자 비밀번호
   - `CRON_SECRET`: Cron API 인증 토큰 (선택사항)

## 프로젝트 구조

```
/
├── app/                      # Next.js App Router
│   ├── admin/                # 관리자 대시보드
│   ├── api/
│   │   ├── admin/            # 관리자 API (stats, coverage, storage, system, logs, cleanup)
│   │   ├── buses/            # 버스 노선/좌석 API
│   │   ├── contact/          # 문의하기 API
│   │   └── cron/             # 데이터 수집 Cron 엔드포인트
│   ├── bus/[id]/             # 버스 상세 페이지
│   └── page.tsx              # 메인 페이지 (검색)
├── lib/
│   ├── api/
│   │   ├── busDataCollector.ts   # 데이터 수집 (지속 실행 모드)
│   │   ├── busDataService.ts     # 데이터 수집 (단일 실행 모드)
│   │   └── publicDataApi.ts      # 공공데이터 API 호출
│   ├── logging/              # 로그 매니저 (로컬 + Supabase Storage)
│   ├── prisma/               # Prisma 클라이언트
│   ├── supabase/             # Supabase 클라이언트
│   └── utils/                # 유틸리티 (인증, 에러 핸들링)
├── middleware.ts             # 프로덕션 디버그 경로 차단
├── prisma/                   # Prisma ORM 스키마
├── scripts/
│   ├── collectBusData.ts     # 수집 스크립트 (지속/단일 모드)
│   └── cleanupStorage.ts     # 스토리지 정리 스크립트
└── .github/workflows/        # GitHub Actions 워크플로우
```

## 로깅 시스템

로그는 로컬 파일과 Supabase Storage에 동시 저장됩니다.

### 로그 레벨
- `debug`: 개발 중 상세 정보
- `info`: 시스템 작동 상태 및 정보
- `warn`: 경고 메시지
- `error`: 오류 메시지

### 사용법
```typescript
import { logger } from '@/lib/logging';

logger.info('서비스가 시작되었습니다.');
logger.error('오류가 발생했습니다.', error);
logger.info('데이터 처리 완료', { count: 10, status: 'success' });
```

### 로그 파일 위치
- **로컬**: `{프로젝트 루트}/logs/log_YYYY-MM-DD.txt`
- **Supabase**: `Storage > bus-logs > YYYY-MM-DD/log_YYYY-MM-DD.txt`
- **관리자 대시보드**: `/admin` 페이지의 로그 조회 섹션

### Supabase Storage 설정 (로그 저장용)

1. Supabase 대시보드 → Storage → New Bucket → 이름: `bus-logs` (private)
2. Policies 탭 → New Policy → `service_role_access`:
   - Allowed operations: `SELECT, INSERT, UPDATE, DELETE`
   - Policy definition: `(auth.role() = 'service_role')`

## 라이선스

MIT

## 기여 방법

1. 저장소 포크
2. 기능 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경 사항 커밋 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 푸시 (`git push origin feature/amazing-feature`)
5. Pull Request 생성
