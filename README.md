# Studio Reservation

스튜디오 렌탈 예약 관리 시스템 (1인 사용자용 / 1시간 단위 예약).

## 기능 (1차)

- 예약 생성 / 수정 / 삭제 (예약자, 날짜, 시간, 시간수, 요금, 태그, 메모)
- 예약 목록 (날짜 범위 + 태그 필터 + 총 금액)
- 월간 캘린더 뷰 (메인 화면)
- Google Calendar 단방향 동기화 (선택)
- 단일 비밀번호 인증

## 스택

- Next.js 16 (App Router) + TypeScript
- Drizzle ORM + PostgreSQL
- Tailwind CSS v4 + shadcn/ui
- googleapis (Calendar API)

## 실행

### 1. Node 20 + pnpm

```bash
nvm use 20
# pnpm 미설치 시: npm i -g pnpm
pnpm install
```

### 2. PostgreSQL 기동

```bash
docker compose up -d
```

### 3. 환경 변수 설정 (.env.local)

`.env.example`을 복사해서 시작하세요.

- `AUTH_COOKIE_SECRET`: 쿠키 서명 비밀키
  ```bash
  pnpm gen-secret
  ```
- `AUTH_PASSWORD_HASH`: 로그인 비밀번호 해시
  ```bash
  pnpm hash-password '내비밀번호'
  ```
  출력된 `AUTH_PASSWORD_HASH=...` 값을 `.env.local`에 붙여넣으세요.

### 4. DB 마이그레이션

```bash
pnpm db:migrate
```

### 5. 개발 서버

```bash
pnpm dev
```

<http://localhost:3000> 접속 → 비밀번호 입력 → 사용

## Google Calendar 연동 (선택)

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials)에서
   OAuth 2.0 Client ID 생성 (Web Application)
2. **승인된 리디렉션 URI**에 `http://localhost:3000/api/google/callback` 추가
3. Google Calendar API 활성화
4. `.env.local`에 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 입력
5. 앱 실행 후 `/settings` → "Google 계정 연결"

연동 후 예약 생성/수정/삭제 시 primary 캘린더에 이벤트가 자동 동기화됩니다.
(연동 실패해도 앱 내 DB는 정상 저장됩니다.)

## 스크립트

| 명령 | 설명 |
|------|------|
| `pnpm dev` | 개발 서버 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm db:generate` | Drizzle 마이그레이션 생성 |
| `pnpm db:migrate` | 마이그레이션 적용 |
| `pnpm db:studio` | Drizzle Studio (DB GUI) |
| `pnpm hash-password '<pw>'` | 비밀번호 해시 생성 |
| `pnpm gen-secret` | 랜덤 32-byte hex 생성 |

## 구조

```
app/
  (authed)/         # 인증 필요한 페이지들
    page.tsx        # / 월간 캘린더 (메인)
    reservations/   # 예약 목록, 생성, 상세/수정
    settings/       # 설정 (기본 요금, Google 연동)
  api/google/       # OAuth connect/callback
  login/            # 로그인
components/         # 공통 컴포넌트 + shadcn/ui
db/
  schema.ts         # Drizzle schema
  migrations/       # SQL 마이그레이션
lib/
  auth.ts           # 단일 패스워드 인증
  reservations.ts   # 예약 server actions & 쿼리
  google-calendar.ts # Google Calendar 클라이언트
  settings.ts       # 설정 조회/수정
  tz.ts             # KST 시간 유틸
proxy.ts            # Next.js 16 proxy (구 middleware)
```

## 로드맵 (이후 단계)

- 2차: 사업자등록증 이미지 → Claude Vision으로 자동 파싱
- 3차: 팝빌/바로빌 연동으로 세금계산서 발행
