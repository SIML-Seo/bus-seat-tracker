# GitHub Actions로 버스 데이터 자동 수집 설정 가이드

> 컴퓨터를 24시간 켜두지 않아도 자동으로 데이터를 수집할 수 있습니다.

---

## 개요

### GitHub Actions란?
GitHub에서 제공하는 무료 CI/CD 서비스입니다. 정해진 시간에 자동으로 코드를 실행할 수 있습니다.

### 실행 방식
기존 Vercel API 호출 방식이 아닌, **직접 스크립트 실행** 방식을 사용합니다.
- `npx tsx scripts/collectBusData.ts --single-run` 명령으로 단일 수집 실행
- DB에 직접 연결하여 데이터 수집 (Vercel 서버 불필요)
- `lib/api/busDataService.ts`의 `collectBusLocationsOnce()` 함수 사용

### 비용

| Repository 유형 | 무료 한도 | 현재 예상 사용량 |
|----------------|-----------|----------------|
| **Public** | **무제한** | - |
| Private | 월 2,000분 | **~3,552분 (초과!)** |

> **주의**: 현재 수집 스케줄 기준, Private 리포에서는 월 무료 한도(2,000분)를 초과합니다.
> - 약 2,368회/월 × 1.5분/회 = ~3,552분/월
> - Public 리포로 전환하거나, 수집 빈도를 대폭 줄여야 합니다.
> - 또는 Oracle Cloud Free Tier 등 대안을 고려하세요.

---

## 설정 방법

### 1단계: GitHub Secrets 설정

1. GitHub Repository로 이동
2. **Settings** → **Secrets and variables** → **Actions** 클릭
3. **New repository secret** 버튼 클릭
4. 다음 Secrets 추가:

| Secret 이름 | 값 | 설명 |
|------------|-----|------|
| `DATABASE_URL` | Supabase DB connection string | Prisma DB 연결 URL |
| `DIRECT_URL` | Supabase Direct URL | Prisma 직접 연결 URL |
| `PUBLIC_DATA_API_KEY` | 공공데이터 API 키 | 버스 데이터 수집용 |
| `SLACK_WEBHOOK_URL` | (선택사항) | 실패 시 알림받을 Slack Webhook URL |

### 2단계: 워크플로우 파일 확인

`.github/workflows/collect-bus-data.yml` 파일이 이미 생성되어 있습니다.

### 3단계: GitHub에 Push

```bash
git add .github/workflows/collect-bus-data.yml
git commit -m "Add GitHub Actions workflow for data collection"
git push origin main
```

### 4단계: 수동 테스트

1. GitHub Repository → **Actions** 탭
2. 왼쪽에서 **Collect Bus Data** 워크플로우 선택
3. **Run workflow** 버튼 클릭
4. **Run workflow** 확인

성공하면 녹색 체크, 실패하면 빨간색 X

---

## 수집 스케줄

### 평일 (월-금)

| 시간대 | 간격 | 설명 |
|-------|------|------|
| 06:00-07:00 | 15분 | 출근 전 |
| 07:00-09:00 | **5분** | 출근 시간 (집중) |
| 09:00-17:30 | 15분 | 일반 시간 |
| 17:30-19:30 | **5분** | 퇴근 시간 (집중) |
| 19:30-22:00 | 15분 | 퇴근 후 |

### 주말 (토-일)

| 시간대 | 간격 |
|-------|------|
| 06:00-22:00 | 30분 |

---

## 단일 실행 모드 vs 지속 실행 모드

| 항목 | 단일 실행 (`--single-run`) | 지속 실행 (기본) |
|------|---------------------------|----------------|
| 사용 환경 | GitHub Actions, Cron | 로컬 PC |
| 서비스 파일 | `busDataService.ts` | `busDataCollector.ts` |
| 중복 필터링 | DB 기반 (동일 버스+정류장, 10분 이내, 좌석차 ≤2) | 메모리 캐시 기반 |
| 정류장 조회 | DB에 없으면 자동 조회 후 저장 | 초기 수집 시 일괄 조회 |
| 노선 자동 복구 | BusRoute 비어있으면 자동 수집 | BusRoute 비어있으면 자동 수집 |
| 프로세스 | 1회 실행 후 종료 | `setInterval` 기반 무한 실행 |

---

## 주의사항

### 1. GitHub Actions cron 지연
GitHub Actions의 cron은 정확하지 않습니다.
- 설정한 시간보다 **1~15분 지연**될 수 있음
- GitHub 서버 상황에 따라 다름
- 데이터 수집에는 큰 문제 없음

### 2. API 호출 한도
현재 설정으로 하루 약 **150-200회** API 호출 예상
- 공공데이터 API 일일 한도: 10,000회
- 충분한 여유 있음

### 3. 월간 실행 시간 초과 (Private 리포)
Private 리포 무료 한도 2,000분을 초과할 수 있음. 해결 방법:
- Public 리포로 전환 (API 키는 Secrets에 있으므로 안전)
- 수집 간격을 늘려서 실행 횟수 감소
- Oracle Cloud Free Tier 등 대안 사용

---

## 대안: Oracle Cloud Free Tier

GitHub Actions 무료 한도가 부족할 경우, Oracle Cloud Free Tier를 고려할 수 있습니다.

| 항목 | 내용 |
|------|------|
| 인스턴스 | ARM A1 (VM.Standard.A1.Flex) |
| 사양 | 최대 4 OCPU, 24GB RAM (Always Free) |
| OS | Ubuntu 22.04 |
| 비용 | 무료 (Always Free 범위 내) |

설정 방법:
1. Oracle Cloud 가입 (Home Region 선택 주의)
2. ARM A1 인스턴스 생성 (용량 부족 시 재시도 필요)
3. Node.js 설치 → pm2로 수집 스크립트 실행
4. `npm run collect:bus`로 지속 실행 모드 사용

> A1 인스턴스는 인기가 많아 "Out of capacity" 오류가 자주 발생합니다.
> 새벽 2~6시(KST)에 시도하거나, 자동 재시도 스택을 활용하세요.

---

## 트러블슈팅

### 문제: 수집 스크립트가 "노선 정보 수집에 실패했습니다"로 종료

**원인**: 공공데이터 API 호출 실패 또는 API 키 미설정

**해결**:
1. GitHub Secrets에 `PUBLIC_DATA_API_KEY`가 설정되어 있는지 확인
2. API 키가 유효한지 확인
3. 공공데이터 포털에서 API 활용 승인 상태 확인

### 문제: DB 연결 실패

**원인**: `DATABASE_URL` 또는 `DIRECT_URL`이 잘못됨

**해결**:
1. Supabase Dashboard에서 연결 문자열 확인
2. GitHub Secrets 값 업데이트
3. Supabase 프로젝트가 pause 상태가 아닌지 확인

### 문제: 워크플로우가 실행되지 않음

**원인**:
- Repository가 비활성화됨 (60일 이상 commit 없음)
- 또는 워크플로우 파일 문법 오류

**해결**:
1. 아무 파일이나 수정 후 push
2. Actions 탭에서 워크플로우 활성화 확인

---

## 로컬 스크립트 vs GitHub Actions

| 항목 | 로컬 스크립트 | GitHub Actions |
|------|--------------|----------------|
| 컴퓨터 24시간 가동 | 필요 | **불필요** |
| 비용 | 전기세 | **무료** (Public repo) |
| 수집 간격 정확도 | 정확함 | 1~15분 오차 가능 |
| 출퇴근 시간 간격 | 3분 | 5분 (GitHub 제한) |
| 안정성 | 컴퓨터 상태에 의존 | GitHub 인프라 의존 |
| 설정 난이도 | 쉬움 | 약간 복잡 |
| 월간 비용 한도 | 없음 | Private 2,000분 제한 |

### 추천
- **데이터 정확도 최우선**: 로컬 스크립트
- **편의성 최우선**: GitHub Actions (Public 리포)
- **24/7 안정 운영**: Oracle Cloud Free Tier
- **둘 다 사용**: 평소엔 GitHub Actions, 중요한 날은 로컬 스크립트 추가 실행

---

## 요약 체크리스트

- [ ] GitHub Secrets 설정 완료
  - [ ] `DATABASE_URL`
  - [ ] `DIRECT_URL`
  - [ ] `PUBLIC_DATA_API_KEY`
- [ ] `.github/workflows/collect-bus-data.yml` push 완료
- [ ] 수동 테스트 성공
- [ ] 월간 실행 시간 한도 확인 (Private 리포 주의)
