# CLAUDE.md - Tika Project

## 프로젝트 개요
Tika는 티켓 기반 칸반 보드 TODO 앱이다 (단일 사용자 MVP).
Next.js App Router 기반으로, 프론트엔드와 백엔드를 디렉토리 수준에서 분리한다.
src/shared/에서 타입과 검증 스키마를 공유한다.

> **현재 상태: 백엔드 구현 진행 중 (TDD)**. scaffold(`package.json`, `app/`, `src/`, 설정 파일)는
> 완료됐고, 로컬 Postgres(`tika_dev`/`tika_test`)에 마이그레이션도 적용돼 있다. FR-001(티켓 생성,
> `POST /api/tickets`)은 TC-API-001 기준 TDD Red→Green으로 이미 구현·테스트 완료됐다. 나머지
> FR-002~008은 `docs/TEST_CASES.md`의 TC-API 순서대로 아래 "SDD 워크플로 규칙"과 TDD 사이클을
> 함께 적용해 진행한다.

## 프로젝트 구조
- app/api/       : 백엔드 진입점 (Route Handlers, 요청 파싱 + 응답만)
- app/(board)/   : 프론트엔드 페이지 그룹 (Chapter 6에서 TDD로 작성 예정)
- src/server/    : 백엔드 로직 (services, db, middleware)
- src/client/    : 프론트엔드 로직 (components, hooks, api 호출)
- src/shared/    : 공유 타입, Zod 스키마, 상수
- __tests__/     : Jest + RTL 테스트 (api/services/components/hooks 계층별 분리)
- drizzle/       : Drizzle Kit이 생성한 마이그레이션 SQL (커밋 대상)
- docs/          : 프로젝트 명세 문서 (PRD/TRD/REQUIREMENTS/API_SPEC/DATA_MODEL/COMPONENT_SPEC/TEST_CASES) — **기능 명세의 단일 소스**
- specs/         : spec-kit(SDD)이 `/speckit-specify` 실행 시 생성하는 `<NNN>-<feature>/{spec,plan,tasks}.md`. docs/를 대체하지 않고, docs/ 내용을 절차적으로 재확인·세분화하는 산출물
- .specify/      : spec-kit 템플릿·스크립트·constitution (`memory/constitution.md`)
- .claude/skills/: spec-kit이 설치한 `/speckit-*` 스킬

## 기술 스택
- Framework: Next.js 15 (App Router)
- Language: TypeScript (strict mode)
- Frontend: React 19
- Styling: Tailwind CSS 4 (`app/globals.css`의 `@import "tailwindcss"` + `app/layout.tsx`)
- Drag & Drop: @dnd-kit/core + @dnd-kit/sortable
- ORM: Drizzle ORM
- DB: Vercel Postgres (Neon) — **로컬/테스트는 `pg`(node-postgres) + `drizzle-orm/node-postgres` 사용**.
  `@vercel/postgres`는 Neon 전용 HTTP 프로토콜이라 로컬 Postgres에 접속 불가해 대체함
  (`src/server/db/index.ts` 참조). 실제 Vercel/Neon 배포 시에는 원래 스택으로 교체 검토 필요.
- Validation: Zod
- Testing: Jest + React Testing Library
- Deployment: Vercel
- SDD 도구: spec-kit (`specify` CLI, `/speckit-*` 스킬) — docs/ 기반 개발 절차를 보조하는 워크플로 레이어

## 프로젝트 문서 (반드시 참조 — 기능 명세의 단일 소스)
- 제품 요구사항: /docs/PRD.md
- 기술 요구사항: /docs/TRD.md
- 상세 요구사항: /docs/REQUIREMENTS.md
- API 명세: /docs/API_SPEC.md
- 데이터 모델: /docs/DATA_MODEL.md
- 컴포넌트 명세: /docs/COMPONENT_SPEC.md
- 테스트 케이스: /docs/TEST_CASES.md
- SDD 산출물(보조): /specs/<NNN>-<feature>/{spec,plan,tasks}.md, /.specify/memory/constitution.md
  — docs/와 내용이 어긋나면 **docs/가 우선**한다. specs/는 docs/를 절차적으로 세분화한 것이지
  새로운 명세 소스가 아니다.

## 아키텍처: 요청 처리 흐름
모든 요청은 4단계 계층을 순서대로만 통과한다 (계층 건너뛰기 금지, 상세: TRD.md 1.2절).

```
Component → useTickets Hook → ticketApi.ts --(fetch)--> Route Handler(app/api/)
  → ticketService.ts(src/server/services) → Drizzle ORM(src/server/db) → Vercel Postgres
```

- 프론트는 `src/server/`를 절대 import하지 않는다. Route Handler와의 통신은 HTTP(fetch)뿐이다.
- Route Handler는 얇게: 요청 파싱 → 서비스 호출 → 응답 변환만. 비즈니스 로직/DB 쿼리 직접 작성 금지.
- DB 접근은 반드시 `ticketService`를 경유해 Drizzle ORM으로만 (raw SQL 금지).
- 프론트의 모든 API 호출은 `src/client/api/ticketApi.ts` 하나를 통해서만 이루어진다.
- Zod 검증은 폼 제출 시 프론트(1차, UX 피드백)와 Route Handler(2차, 신뢰 경계) 양쪽에서
  `src/shared/validations`의 **동일한** 스키마로 수행한다.

## 핵심 비즈니스 규칙 (여러 문서에 걸쳐 있어 특히 주의)
DB에 저장하지 않는 파생 로직과 자동 필드 관리는 서비스 계층(`ticketService`)의 책임이다.

- **status/priority**: DB ENUM 미사용, `VARCHAR` + Zod 검증으로 제약 (마이그레이션 단순화 목적).
  허용값은 `src/shared/types`의 `TICKET_STATUS`/`TICKET_PRIORITY` 상수 참조.
- **startedAt/completedAt은 시스템 전용 필드** — 사용자가 직접 수정 불가, `PATCH /api/tickets/:id`로는 변경되지 않음.
  - TODO로 이동 → `startedAt = now()` / TODO→BACKLOG → `startedAt = null` / 그 외 이동은 변경 없음
  - DONE으로 이동(`/api/tickets/:id/complete`) → `completedAt = now()` / DONE에서 이탈(`/reorder`) → `completedAt = null`
- **Done 이동은 별도 API**: DONE으로 가는 이동만 `PATCH /api/tickets/:id/complete`를 쓰고,
  그 외 모든 이동(Done에서 나가는 것 포함)은 `PATCH /api/tickets/reorder`를 쓴다.
  `ReorderTicketInput.status`는 DONE을 허용하지 않는다.
- **position 관리** (칼럼 내 오름차순, 정수 간격 1024 사용):
  - 신규/완료 삽입: 맨 위 배치 = `min(position) - 1024`
  - 두 카드 사이 삽입: `(prev + next) / 2`
  - 간격이 1 미만으로 좁아지면 해당 칼럼 전체를 1024 간격으로 재정렬
  - 서버는 클라이언트가 보낸 position을 그대로 신뢰하지 않고 재계산한다.
- **isOverdue** (파생 필드, 미저장): `dueDate < 오늘 && status !== DONE`. `GET /api/tickets` 응답에만 계산되어 포함.
- **Done 칼럼 24시간 필터**: `completedAt` 기준 24시간 경과한 DONE 티켓은 보드 조회에서 제외(숨김, 삭제 아님).
- **드래그앤드롭은 낙관적 업데이트**: `useTickets` 훅이 로컬 상태를 즉시 갱신하고, API 실패 시 롤백한다.
- **에러 응답 형식 통일**: `{ error: { code, message } }`, 코드는 `VALIDATION_ERROR` / `TICKET_NOT_FOUND` / `INTERNAL_ERROR`.

## 코딩 컨벤션

### TypeScript (공통)
- strict 모드 사용
- any 사용 금지, unknown 사용 후 타입 가드
- 인터페이스는 I 접두사 없이 명사로 (예: Ticket, BoardData)
- enum 대신 const 객체 + typeof 패턴 사용
- 공유 타입은 반드시 @/shared/types에서 import

### 백엔드 (app/api/ + src/server/)
- Route Handler는 얇게: 요청 파싱 → 서비스 호출 → 응답 반환
- 비즈니스 로직은 src/server/services/에 작성
- Zod로 요청 검증 (shared/validations에서 import)
- 에러 응답 형식 통일: { error: { code, message } }
- HTTP 상태 코드: 200, 201, 204, 400, 404, 500
- DB 쿼리는 Drizzle ORM으로만 작성 (raw SQL 금지)

### 프론트엔드 (src/client/)
- 함수 컴포넌트 + 화살표 함수
- Props 타입은 컴포넌트 파일 내 정의
- API 호출은 src/client/api/ticketApi.ts를 통해서만
- 파일명: PascalCase (예: TicketCard.tsx)

## 개발 규칙

### 반드시 지켜야 할 것
- 새 기능 구현 전 TEST_CASES.md의 해당 테스트부터 작성
- API 구현 시 API_SPEC.md의 명세를 정확히 따르기
- 컴포넌트 구현 시 COMPONENT_SPEC.md의 Props와 동작 준수
- 타입 변경 시 src/shared/types 먼저 수정

### 하지 말아야 할 것
- 명세에 없는 기능 임의 추가 금지
- 테스트 코드 삭제 또는 skip 금지
- any 타입 사용 금지
- console.log 커밋 금지 (디버깅 후 제거)
- src/client/에서 직접 DB 접근 금지
- src/server/에서 React 관련 코드 작성 금지

### 경계 규칙
- 백엔드 작업 시(app/api/, src/server/) 프론트엔드(src/client/) 코드 수정 금지
- 프론트엔드 작업 시(src/client/) 백엔드(app/api/, src/server/) 코드 수정 금지
- 양쪽에 영향을 주는 변경은 src/shared/ 먼저 수정 후 각각 반영

### TDD 사이클 규칙
- Red 단계: 테스트 코드만 작성, 구현 코드 생성 금지
- Green 단계: 테스트를 통과하는 최소한의 코드만 작성, 테스트 코드 수정 금지
- Refactor 단계: 코드 개선만, 새 기능 추가 금지, 테스트는 반드시 통과 유지
- 테스트와 구현을 한 번에 작성하지 말 것 — 반드시 단계별로 진행
- 테스트 실패 시 구현을 수정할 것, 테스트를 수정하지 말 것 (명세 오류인 경우 명세 먼저 수정)

## SDD 워크플로 규칙

spec-kit(`/speckit-*`)은 **docs/를 대체하지 않고, docs/를 입력으로 삼아 진행 절차를 강제하는 레이어**다.
docs/*.md가 이미 다루는 FR-001~FR-008 범위 안에서는 아래 순서를 참고 절차로만 쓰고, docs/의 내용과
충돌하면 항상 docs/가 우선한다. TDD 사이클 규칙(위)은 SDD 절차와 별개로 계속 그대로 적용된다 —
`/speckit-implement` 단계도 Red→Green→Refactor를 건너뛰지 않는다.

### 절차 순서
1. `/speckit-constitution` — 프로젝트 원칙 수립/갱신. Tika는 이 CLAUDE.md와 `docs/TRD.md` §4
   경계 규칙, TDD 사이클 규칙을 constitution의 핵심 원칙으로 반영한다.
2. `/speckit-specify` — 새 기능(또는 기존 FR의 세분화)에 대해 `specs/<NNN>-<feature>/spec.md` 생성.
   입력은 반드시 `docs/PRD.md`·`docs/REQUIREMENTS.md`의 해당 FR/US를 근거로 작성하고, 새 요구사항을
   임의로 추가하지 않는다.
3. `/speckit-clarify` (선택) — `/speckit-plan` 이전에 모호한 부분을 질문으로 해소.
4. `/speckit-plan` — `plan.md` 생성. "아키텍처: 요청 처리 흐름"(4단계 계층)과 경계 규칙을 반드시
   따르며, `docs/API_SPEC.md`/`docs/DATA_MODEL.md`의 계약을 그대로 재사용한다(새 계약 임의 정의 금지).
5. `/speckit-tasks` — `tasks.md` 생성. 가능한 경우 `docs/TEST_CASES.md`의 TC-API/TC-COMP/TC-INT
   ID에 매핑해 작성하고, 이미 있는 테스트 케이스를 중복 정의하지 않는다.
6. `/speckit-analyze`, `/speckit-checklist` (선택) — plan/tasks 생성 후, 구현 전 정합성·완결성 점검.
7. `/speckit-implement` — tasks.md를 실행하되, 각 태스크 내부에서는 TDD 사이클 규칙(Red→Green→Refactor)을
   그대로 적용한다.
8. `/speckit-converge` — 구현 완료 후 코드베이스와 spec/plan/tasks를 대조해 누락된 작업을 tasks.md에
   추가한다.

### 원칙
- docs/에 이미 명세된 FR(예: FR-001~008)은 `/speckit-specify`로 다시 만들지 않는다 — 필요하면
  기존 docs/ 문서를 먼저 수정한다.
- `specs/`, `.specify/memory/constitution.md`는 커밋 대상이며, `.claude/`는 자격 증명이 담길 수
  있으므로 `.gitignore` 처리 여부를 별도로 확인한다.
- SDD 절차 도입이 "새 기능 구현 전 TEST_CASES.md의 해당 테스트부터 작성" 같은 기존 개발 규칙을
  약화시키지 않는다 — SDD는 그 규칙을 지키기 위한 절차적 뼈대일 뿐이다.

## 주요 명령어 (README.md 기준)
| 명령어 | 설명 | 상태 |
|--------|------|------|
| `npm run dev` | 개발 서버 실행 | 확인됨 |
| `npm run build` | 프로덕션 빌드 | 확인됨 |
| `npm run test` / `test:watch` | 테스트 실행 / 감시 모드 | 확인됨 (6/6 통과) |
| `npm run db:generate` / `db:migrate` | Drizzle 마이그레이션 생성/적용 | 확인됨 (`.env.local` 자동 로드하도록 `drizzle.config.ts` 수정됨) |
| `npm run lint` | ESLint | 확인됨 (경계 규칙 포함, 클린) |
| `npm run db:studio` | Drizzle Studio (DB GUI) | 미확인 |
| `npm run db:seed` | 시드 데이터 삽입 (docs/DATA_MODEL.md 6절 참조) | **미구현** — `src/server/db/seed.ts` 파일 자체가 아직 없음 |
| `npm run format` / `format:check` | Prettier | 동작은 하나, 현재 31개 파일(주로 docs/*.md, 설정 파일)이 미포맷 상태 — 별도로 정리 필요 |
