# 좌석 버스 잔여석 안내 서비스

대한민국 경기도 버스의 실시간 잔여석 정보를 수집하고 시간대별, 정류장별 통계를 제공하는 웹 서비스입니다.

## 주요 기능

- 버스 번호로 노선 검색
- 시간대별/정류장별 평균 잔여석 정보 제공
- 요일 및 시간 필터링
- 3분 간격 실시간 데이터 수집(그룹화)

## 기술 스택

### 프론트엔드
- Next.js
- Tailwind CSS

### 백엔드
- Next.js API Routes
- Prisma ORM
- PostgreSQL (Supabase)

### 데이터 수집
- 공공데이터포털 API

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

3. Supabase 프로젝트 설정
   - [Supabase](https://supabase.com)에 가입하고 새 프로젝트 생성
   - 프로젝트 URL, API 키, 데이터베이스 연결 문자열 복사
   - [Supabase 대시보드](https://app.supabase.io) > 프로젝트 선택 > Settings > API > Project API keys

4. 환경 설정
`.env` 파일을 생성하고 다음 내용 추가:
```
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres"
SUPABASE_URL="https://[YOUR-PROJECT-ID].supabase.co"
SUPABASE_KEY="your-anon-key"
PUBLIC_DATA_API_KEY="your-api-key-here"
DATA_COLLECTION_INTERVAL="120000"
```

5. 데이터베이스 마이그레이션
```bash
npx prisma migrate dev --name init
```

6. 개발 서버 실행
```bash
npm run dev
```

## 배포 방법 (Vercel)

1. Vercel 계정 생성 및 연결

2. Supabase 데이터베이스 연결 확인
   - 데이터베이스 연결 문자열이 올바른지 확인

3. Vercel에 환경 변수 설정
   - `DATABASE_URL`: Supabase 데이터베이스 연결 문자열
   - `SUPABASE_URL`: Supabase 프로젝트 URL
   - `SUPABASE_KEY`: Supabase API 키
   - `PUBLIC_DATA_API_KEY`: 공공데이터포털 API 키

## 프로젝트 구조

```
/
├── app/                  # Next.js App Router
│   ├── api/              # API 라우트
│   │   ├── buses/        # 버스 API 엔드포인트
│   │   └── cron/         # 데이터 수집 cron 작업
│   ├── bus/[id]/         # 버스 상세 페이지
│   └── page.tsx          # 메인 페이지
├── components/           # React 컴포넌트
├── lib/                  # 유틸리티 함수
│   ├── api/              # API 관련 유틸리티
│   ├── logging/          # 로그 파일 생성
│   ├── prisma/           # Prisma 클라이언트
│   └── supabase/         # Supabase 클라이언트
├── logs/                 # 로그 파일
├── prisma/               # Prisma ORM 스키마
├── public/               # 정적 파일
└── scripts/              # 버스 잔여석 데이터 수집 작업
```

## 라이선스

MIT

## 기여 방법

1. 저장소 포크
2. 기능 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경 사항 커밋 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 푸시 (`git push origin feature/amazing-feature`)
5. Pull Request 생성

## 로깅 시스템 설정 및 사용법

프로젝트에는 로깅 시스템이 통합되어 있으며, 모든 로그는 로컬 및 Supabase Storage에 저장됩니다.

### 설정 방법

1. Supabase Storage 버킷 생성하기:
   - Supabase 대시보드에서 "Storage" 메뉴로 이동
   - "New Bucket" 버튼 클릭
   - 버킷 이름을 "bus-logs"로 설정 (private 선택)
   - "Save" 버튼 클릭

2. 권한 설정:
   - 생성된 버킷의 "Policies" 탭 클릭
   - "New Policy" 버튼 클릭
   - "For full customization" 선택
   - 다음과 같이 설정:
     - Policy name: `service_role_access`
     - Allowed operations: `SELECT, INSERT, UPDATE, DELETE`
     - Policy definition: `(auth.role() = 'service_role')`
     - Policy action: `PERMISSIVE`
   - "Save Policy" 버튼 클릭

3. .env 파일에 서비스 롤 키 추가:
   ```
   # Supabase Service Role Key (로깅 시스템용)
   SUPABASE_SERVICE_ROLE_KEY="프로젝트 서비스 롤 키"
   ```

### 로거 사용법

로깅 시스템은 다음 레벨의 로그를 제공합니다:
- `debug`: 개발 중 상세 정보
- `info`: 시스템 작동 상태 및 정보
- `warn`: 경고 메시지
- `error`: 오류 메시지

코드에서 로깅 시스템 사용하기:

```typescript
import { logger } from '@/lib/logging';

// 기본 로깅
logger.info('서비스가 시작되었습니다.');

// 오류 로깅
try {
  // 코드 실행
} catch (error) {
  logger.error('오류가 발생했습니다.', error);
}

// 추가 데이터와 함께 로깅
logger.info('데이터 처리 완료', { count: 10, status: 'success' });
```

### 로그 파일 위치

- **로컬**: `{프로젝트 루트}/logs/log_YYYY-MM-DD.txt`
- **Supabase**: `Storage > bus-logs > YYYY-MM-DD/log_YYYY-MM-DD.txt`

### 로깅 시스템 특징

- **날짜별 분류**: 매일 새로운 로그 파일이 생성됩니다.
- **버퍼링**: 로그는 메모리에 버퍼링되었다가 100개 항목마다 또는 1분마다 파일로 저장됩니다.
- **오류 복원**: 저장 실패 시 자동 재시도 메커니즘이 포함되어 있습니다.
- **종료 시 저장**: 프로세스 종료 시 모든 버퍼된 로그가 저장됩니다.

이 로깅 시스템을 통해 서비스의 동작을 모니터링하고 문제 발생 시 원인을 효과적으로 추적할 수 있습니다.
