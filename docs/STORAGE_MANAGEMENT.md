# Supabase 무료 티어 용량 관리 가이드

---

## Supabase 무료 티어 한도

| 항목 | 한도 | 현재 사용량 확인 |
|------|------|-----------------|
| **Database** | 500MB | Supabase Dashboard → Database → Database size |
| **Storage** | 1GB | Supabase Dashboard → Storage → 사용량 |
| **Bandwidth** | 2GB/월 | Supabase Dashboard → Settings → Usage |

---

## 용량을 차지하는 주요 요소

### 1. BusLocation 테이블 (가장 큼!)

- 매 수집마다 버스 위치 데이터 저장
- 하루에 **수천~수만 개** 레코드 생성
- 데이터 크기: 레코드당 약 200~300 bytes

**예상 사용량 (1일 기준)**:
- 평일: ~3,000개 × 250 bytes = ~750KB
- 주말: ~1,500개 × 250 bytes = ~375KB
- **월간**: ~50MB+ (누적 시)

### 2. Supabase Storage (로그 파일)

- `lib/logging/logger.ts`에서 매일 로그 파일 업로드
- 버킷: `bus-logs`
- 파일명: `YYYY-MM-DD/log_YYYY-MM-DD.txt`

**예상 사용량**:
- 하루 로그: ~100KB~1MB
- 월간: ~30MB (정리 안 하면)

### 3. BusStopSeats 테이블

- 노선별 × 정류장별 × 요일별 × 시간대별 통계
- 약 `노선 수 × 평균 정류장 수 × 7일 × 24시간` 레코드

**예상 레코드 수**:
- 100개 노선 × 30개 정류장 × 7일 × 18시간 = ~378,000개
- 레코드당 약 150 bytes = ~57MB (최대 누적 시)

---

## 용량 관리 방법

### 방법 1: 관리자 대시보드 사용 (추천)

`/admin` 페이지에서 UI를 통해 관리할 수 있습니다.

#### 오래된 BusLocation 정리
1. 관리자 대시보드 접속 (`/admin`)
2. **스토리지 관리** 섹션에서 보관 시간 설정 (기본 6시간)
3. **정리 실행** 버튼 클릭

#### BusStopSeats 초기화
1. 관리자 대시보드 접속
2. **스토리지 관리** 섹션에서 **BusStopSeats 초기화** 버튼 클릭
3. 확인 창에서 승인

#### 전체 초기화 (모든 테이블)
1. 관리자 대시보드 접속
2. **스토리지 관리** 섹션에서 **전체 초기화** 버튼 클릭
3. 확인 창에서 승인
4. 관리자 비밀번호 입력
5. 삭제 순서: BusLocation → BusStopSeats → BusStop → BusRoute → Contact (FK 순서)

> 전체 초기화 후 수집 스크립트를 다시 실행하면, 노선 정보가 자동으로 재수집됩니다.

### 방법 2: cleanup 스크립트 실행 (수동)

```bash
# 용량 정리 실행
npm run cleanup

# DB 상태만 확인
npm run db:status
```

### 방법 3: 보관 기간 조정

`scripts/cleanupStorage.ts`에서 설정 변경:

```typescript
const CONFIG = {
  // BusLocation 보관 기간 (시간)
  // 용량 부족하면 12 → 6으로 줄이기
  BUS_LOCATION_RETENTION_HOURS: 12,

  // 로그 파일 보관 기간 (일)
  // 용량 부족하면 7 → 3으로 줄이기
  LOG_RETENTION_DAYS: 7,
};
```

---

## 용량이 꽉 찼을 때 긴급 대처

### 1. 관리자 대시보드에서 정리 (가장 쉬움)

1. `/admin` 접속
2. BusLocation 정리 실행 (보관 시간을 1시간으로 설정)
3. 필요 시 BusStopSeats 초기화

### 2. 즉시 대량 삭제 (SQL)

Supabase Dashboard → SQL Editor:

```sql
-- BusLocation 테이블 6시간 이전 데이터 모두 삭제
DELETE FROM "BusLocation"
WHERE "updatedAt" < NOW() - INTERVAL '6 hours';

-- 삭제된 행 수 확인
SELECT COUNT(*) FROM "BusLocation";
```

### 3. 로그 Storage 비우기

Supabase Dashboard → Storage → bus-logs:
- 오래된 폴더 선택 → Delete

---

## 용량 모니터링

### 관리자 대시보드에서 확인

`/admin` 페이지의 **스토리지 관리** 섹션에서:
- 테이블별 레코드 수
- 예상 용량
- 총 DB 사용량 확인 가능

### Supabase Dashboard에서 확인

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. **Settings** → **Usage** 에서 전체 사용량 확인
4. **Database** → 상단에 Database size 표시

### SQL로 테이블별 크기 확인

Supabase Dashboard → SQL Editor:

```sql
-- 테이블별 크기 확인
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) AS table_size,
  pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
```

### 레코드 수 확인

```sql
SELECT 'BusLocation' as table_name, COUNT(*) as count FROM "BusLocation"
UNION ALL
SELECT 'BusStopSeats', COUNT(*) FROM "BusStopSeats"
UNION ALL
SELECT 'BusRoute', COUNT(*) FROM "BusRoute"
UNION ALL
SELECT 'BusStop', COUNT(*) FROM "BusStop"
UNION ALL
SELECT 'Contact', COUNT(*) FROM "Contact";
```

---

## 권장 설정

### 보관 기간 권장값

| 테이블/파일 | 권장 보관 기간 | 이유 |
|------------|---------------|------|
| BusLocation | 6~12시간 | 실시간 데이터, 통계 계산 후 불필요 |
| 로그 파일 | 3~7일 | 문제 발생 시 디버깅용 |
| BusStopSeats | 영구 | 통계 데이터, 서비스의 핵심 |

### 자동 정리 주기

| 방법 | 주기 |
|------|------|
| BusLocation cleanup | 6시간마다 (수집 스크립트에서 자동 실행) |
| Storage 로그 cleanup | 매일 1회 |
| 전체 점검 | 주 1회 (관리자 대시보드에서 확인) |

---

## 요약

1. **주 원인**: BusLocation 테이블 무한 증가
2. **1차 해결**: 관리자 대시보드 (`/admin`)에서 정리/초기화 실행
3. **2차 해결**: `npm run cleanup` 정기 실행
4. **모니터링**: 관리자 대시보드 또는 Supabase Dashboard에서 주기적 확인
5. **긴급 시**: SQL로 직접 대량 삭제
