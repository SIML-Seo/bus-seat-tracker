# Supabase 설정 가이드

이 가이드는 좌석 버스 잔여석 안내 서비스를 위한 Supabase 설정 과정을 안내합니다.

## 1. Supabase 계정 생성

1. [Supabase 웹사이트](https://supabase.com/)에 접속합니다.
2. "Start for free" 버튼을 클릭합니다.
3. GitHub 계정 또는 이메일로 회원가입하고 로그인합니다.

## 2. 새 프로젝트 생성

1. Supabase 대시보드에서 "New Project" 버튼을 클릭합니다.
2. 조직을 선택하거나 새로 생성합니다.
3. 프로젝트 이름을 "bus-seats-info" 또는 원하는 이름으로 입력합니다.
4. 데이터베이스 비밀번호를 설정합니다 (안전하게 보관하세요).
5. 지역(Region)을 선택합니다 (서비스 사용자의 위치와 가까운 곳으로 선택).
6. "Create new project" 버튼을 클릭합니다.

## 3. 프로젝트 API 키 가져오기

1. 프로젝트가 생성되면 왼쪽 메뉴에서 "Settings" > "API"를 클릭합니다.
2. "Project API keys" 섹션에서 다음 정보를 찾을 수 있습니다:
   - `Project URL`: SUPABASE_URL에 설정할 값
   - `anon public`: SUPABASE_KEY에 설정할 값
   - `service_role key`: 개발 중에만 사용하고 절대 공개하지 마세요

## 4. 데이터베이스 연결 정보 가져오기

1. 왼쪽 메뉴에서 "Settings" > "Database"를 클릭합니다.
2. "Connection string" 섹션에서 "Prisma"를 선택합니다.
3. 표시된 연결 문자열을 복사하여 .env 파일의 DATABASE_URL에 붙여넣습니다.
4. [YOUR-PASSWORD] 부분을 프로젝트 생성 시 설정한 데이터베이스 비밀번호로 변경합니다.

## 5. .env 파일 설정 예시

```
DATABASE_URL="postgresql://postgres:YourPassword123@db.abcdefghijklm.supabase.co:5432/postgres"
SUPABASE_URL="https://abcdefghijklm.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG0iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNTI1MjYwNywiZXhwIjoxOTMwODI4NjA3fQ.examplekeydonotuse"
```

## 6. 데이터베이스 마이그레이션

환경 설정을 완료했다면 다음 명령을 실행하여 데이터베이스 스키마를 생성합니다:

```bash
npx prisma migrate dev --name init
```

## 7. 데이터베이스 관리

Supabase는 편리한 데이터베이스 관리 도구를 제공합니다:

1. 대시보드에서 "Table Editor"를 클릭하면 테이블과 데이터를 시각적으로 관리할 수 있습니다.
2. SQL 편집기를 통해 직접 쿼리를 실행할 수도 있습니다.
3. "Authentication" 메뉴에서 나중에 사용자 인증 기능을 추가할 수 있습니다.

## 8. 개발 중 유의사항

- 개발 과정에서는 Prisma Studio를 활용하여 데이터를 관리할 수 있습니다:
  ```bash
  npx prisma studio
  ```
  
- 스키마를 변경한 후에는 항상 마이그레이션을 실행해야 합니다:
  ```bash
  npx prisma migrate dev --name [변경내용]
  ```

- 클라이언트 코드를 생성해야 합니다:
  ```bash
  npx prisma generate
  ``` 