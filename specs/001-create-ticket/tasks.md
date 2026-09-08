---

description: "Task list for 001-create-ticket (티켓 생성)"
---

# Tasks: 티켓 생성 (Create Ticket)

**Input**: Design documents from `/specs/001-create-ticket/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: 테스트 태스크를 포함한다. 이 프로젝트는 `CLAUDE.md`와 constitution 원칙 VI(TDD)가
테스트 우선을 강제하고, `docs/TEST_CASES.md` TC-API-001이 이미 11개 시나리오를 정의하고 있다.

**Organization**: spec.md의 User Story(P1/P2/P3) 단위로 그룹화.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (서로 다른 파일, 의존성 없음)
- **[Story]**: 해당 태스크가 속한 User Story (US1, US2, US3)
- `[X]` 체크된 태스크는 **이미 완료된 작업** (커밋 `245564c` 기준)

## ⚠️ 이 tasks.md의 성격

FR-001은 이미 구현·테스트가 끝난 기능이다. 따라서 이 목록은 "처음부터 만들 작업 목록"이 아니라
**이미 완료된 것과 실제로 남은 것을 구분한 목록**이다. 완료분은 `[X]`로 표시했고, 체크되지 않은
태스크만 실제 남은 작업이다.

남은 작업의 출처는 3가지다:
1. plan.md의 **Constitution Check FAIL 1건** (Single Source of Truth — `src/shared/types/` 비어 있음)
2. **테스트 커버리지 공백** — `docs/TEST_CASES.md` TC-API-001의 11개 시나리오 중 6개만 구현됨
3. **테스트 격리 결함** — 실측 확인: 테스트 1회 실행마다 `tika_test`에 행이 2개씩 누적됨
   (14행 → 16행), 정리(teardown) 로직 없음

> **중요**: 새로 추가하는 테스트(T010, T015, T020~T023)는 이미 동작하는 구현을 검증하므로
> Red 단계 없이 곧바로 통과할 가능성이 높다. 이는 TDD 위반이 아니라 **기존 구현에 대한 커버리지
> 보강**이다. 단, 통과를 확인하기 전에 "왜 통과하는지" 근거를 확인하고, 예상과 달리 실패하면
> 그것은 구현 결함이므로 테스트가 아니라 구현을 고친다 (`CLAUDE.md` TDD 사이클 규칙).

## Path Conventions

Tika는 하나의 Next.js 프로젝트 안에서 디렉터리로 계층을 분리한다 (`docs/TRD.md` §1.3):
`app/api/`(진입점), `src/server/`(백엔드 로직), `src/shared/`(공유), `__tests__/`(테스트).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 프로젝트 초기화 — **전부 완료됨** (커밋 `f9d8803`)

- [X] T001 Next.js 15 App Router + TypeScript strict 스캐폴드 및 디렉터리 구조 생성 (`tsconfig.json`, `next.config.ts`)
- [X] T002 의존성 설치 — Drizzle ORM, Zod, pg, Jest, RTL (`package.json`)
- [X] T003 [P] ESLint 경계 규칙 + Prettier 설정 (`eslint.config.mjs`, `.prettierrc.json`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 User Story가 의존하는 핵심 기반

**⚠️ CRITICAL**: T008은 신규 테스트(T010, T015, T020~T023)의 전제였으며, **완료됨** —
테스트가 생성한 행을 id 한정으로 정리하고 커넥션 풀을 닫는다.

- [X] T004 `tickets` 테이블 Drizzle 스키마 정의 (`src/server/db/schema.ts`)
- [X] T005 최초 마이그레이션 생성 및 `tika_dev`/`tika_test`에 적용 (`drizzle/0000_warm_famine.sql`)
- [X] T006 pg Pool + Drizzle 클라이언트 구성 (`src/server/db/index.ts`)
- [X] T007 `createTicketSchema` Zod 스키마 정의 (`src/shared/validations/ticket.ts`)
- [X] T008 테스트 격리 확보 — `__tests__/api/tickets.test.ts`에 `afterEach`로 생성된 티켓 정리,
      `afterAll`로 pg Pool 종료 추가. 현재 실행마다 `tika_test`에 행이 누적되고("14→16행" 실측),
      Pool 미종료로 `Jest did not exit` 경고가 발생한다. 정리는 반드시 `WHERE` 절이 있는 대상
      한정 삭제로 수행한다 (constitution Guardrails: `TRUNCATE`/무조건 `DELETE FROM` 금지)

**Checkpoint**: T008 완료 후 테스트가 반복 실행돼도 결과가 일정해야 함

---

## Phase 3: User Story 1 - 제목만으로 빠르게 등록 (Priority: P1)

**Goal**: 제목 하나만으로 즉시 등록되고, 항상 Backlog 맨 위에 놓인다

**Independent Test**: 제목만 채워 등록 요청 → 우선순위 MEDIUM, status BACKLOG, Backlog 최상단 배치 확인

### Tests for User Story 1

- [X] T009 [P] [US1] 제목만으로 생성 시 201 + priority=MEDIUM 검증 (`__tests__/api/tickets.test.ts`)
- [X] T010 [P] [US1] TC-API-001 001-10 — 연속 2건 생성 시 나중 티켓의 `position`이 더 작음(맨 위 배치)을
      검증하는 테스트 추가 (`__tests__/api/tickets.test.ts`). spec.md US1 인수 시나리오 2에 대응하며,
      현재 **미커버 상태**. T008 완료 후 진행

### Implementation for User Story 1

- [X] T011 [US1] `create()` — BACKLOG 칼럼 `min(position) - 1024` 계산 후 INSERT (`src/server/services/ticketService.ts`)
- [X] T012 [US1] `POST` Route Handler — 파싱 → Zod 검증 → 서비스 호출 → 201 응답 (`app/api/tickets/route.ts`)

**Checkpoint**: US1 단독으로 완전히 동작 (T010 추가 시 인수 시나리오 2까지 검증됨)

---

## Phase 4: User Story 2 - 상세 정보를 포함해 등록 (Priority: P2)

**Goal**: 설명·우선순위·시작예정일·종료예정일을 함께 저장하고 그대로 반환한다

**Independent Test**: 전체 필드를 채워 등록 → 응답에 입력값이 누락·변형 없이 반영되는지 확인

### Tests for User Story 2

- [X] T013 [P] [US2] 전체 필드 생성 시 201 + 입력값 그대로 반영 검증 (`__tests__/api/tickets.test.ts`)
- [X] T014 [P] [US2] 과거 종료예정일 거부(400) 검증 (`__tests__/api/tickets.test.ts`)
- [X] T015 [P] [US2] TC-API-001 001-11 보강 — 설명을 생략했을 때 `description`이 `null`로 저장되고,
      `startedAt`/`completedAt`이 생성 시점에 항상 `null`임을 **제목만 생성한 경우**에도 명시적으로
      검증 (`__tests__/api/tickets.test.ts`). 현재는 전체 필드 케이스에서만 간접 확인됨.
      spec.md FR-008에 대응. T008 완료 후 진행

### Implementation for User Story 2

- [X] T016 [US2] `dueDate` 오늘 포함 이후 제약 및 선택 필드 처리 (`src/shared/validations/ticket.ts`)

**Checkpoint**: US1, US2 모두 독립적으로 동작

---

## Phase 5: User Story 3 - 잘못된 입력으로부터 데이터 보호 (Priority: P3)

**Goal**: 잘못된 입력은 100% 거부되고, 원인을 구분할 수 있는 사유가 반환된다

**Independent Test**: 각 잘못된 입력을 개별 제출 → 매번 400 + 해당 사유 반환, DB에 아무것도 저장 안 됨

### Tests for User Story 3

- [X] T017 [P] [US3] 제목 누락(`{}`) → 400 "제목을 입력해주세요" (`__tests__/api/tickets.test.ts`)
- [X] T018 [P] [US3] 제목 200자 초과 → 400 (`__tests__/api/tickets.test.ts`)
- [X] T019 [P] [US3] 잘못된 우선순위 값 → 400 (`__tests__/api/tickets.test.ts`)
- [X] T020 [P] [US3] TC-API-001 001-4 — 빈 제목(`{ title: "" }`) → 400 "제목을 입력해주세요"
      (`__tests__/api/tickets.test.ts`). 현재 미커버
- [X] T021 [P] [US3] TC-API-001 001-5 — 공백만 제목(`{ title: "   " }`) → 400 "제목을 입력해주세요"
      (`__tests__/api/tickets.test.ts`). spec.md Edge Case에 대응, 현재 미커버
- [X] T022 [P] [US3] TC-API-001 001-7 — 설명 1000자 초과 → 400 "설명은 1000자 이내로 입력해주세요"
      (`__tests__/api/tickets.test.ts`). 현재 미커버
- [X] T023 [P] [US3] 경계값 — 제목 정확히 200자는 **허용**(201)됨을 검증 (`__tests__/api/tickets.test.ts`).
      spec.md Edge Case("200자 허용, 201자부터 거부")에 대응, 현재 미커버

### Implementation for User Story 3

- [X] T024 [US3] Zod 검증 실패 시 `{ error: { code: 'VALIDATION_ERROR', message } }` 400 응답 (`app/api/tickets/route.ts`)

**Checkpoint**: 세 User Story 모두 독립적으로 검증 가능

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: constitution 준수 회복 및 문서 정합성 정리

- [X] T025 **[Gate FAIL 해소]** `src/shared/types/index.ts` 신규 작성 — `TICKET_STATUS`,
      `TICKET_PRIORITY` 상수(const 객체 + `as const`)와 `Ticket` 인터페이스 정의
      (`data-model.md` "설계 결정" 절의 코드 그대로). 기존 `.gitkeep` 제거.
      plan.md Constitution Check의 유일한 FAIL 항목이며, 이 태스크 완료 전까지 Gate는 FAIL 상태
- [X] T026 `ticketService.create()` 반환 타입을 `Promise<Ticket>`(`@/shared/types`)로 명시
      (`src/server/services/ticketService.ts`). T025에 의존. **테스트는 수정하지 않으며 계속
      통과해야 함** — 런타임 동작 불변의 타입 표기 강화(Refactor 단계)
- [X] T027 [P] `docs/API_SPEC.md` §1 문구 정정 — 종료예정일 제약을 "오늘 이후" → "오늘부터"로 수정.
      실제 구현·테스트는 오늘 날짜를 허용(`>=`)하는데 문서만 오늘을 배제하는 것처럼 읽혀 불일치가
      있다 (spec.md에서 사용자 확인으로 "오늘 포함 허용" 확정). constitution 원칙 I에 따라 문서를 정정
- [X] T028 [P] `tika_dev`에 남은 검증용 티켓 정리 — `/speckit-plan` 단계에서 quickstart 검증 중
      생성된 `plan quickstart check`(id=1) 1건 삭제. `WHERE id = 1` 한정 삭제로 수행하고,
      실행 전 사용자 승인을 받는다 (constitution Guardrails: 삭제 작업 사용자 승인 필수)
- [X] T029 전체 검증 — `npm test`(TC-API-001 확장분 포함 전부 통과), `npx tsc --noEmit`,
      `npx eslint app src`, 그리고 [quickstart.md](./quickstart.md)의 curl 시나리오 재실행

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 완료됨
- **Phase 2 (Foundational)**: T004~T008 전부 완료
- **Phase 3~5 (User Stories)**: 구현은 모두 완료, 각 스토리의 신규 테스트 태스크만 T008에 의존
- **Phase 6 (Polish)**: T025 → T026 순서 의존. T027, T028은 독립적으로 병렬 가능

### Within Each User Story

- 신규 테스트 태스크는 T008(테스트 격리) 완료 후 진행
- T025(타입 정의) → T026(서비스 시그니처)는 순차
- T026 이후 반드시 기존 테스트가 그대로 통과하는지 확인 (Refactor 규칙)

### Parallel Opportunities

- **T020, T021, T022, T023** — 모두 US3의 독립적인 검증 케이스로 동시 작성 가능
  (단, 같은 파일 `__tests__/api/tickets.test.ts`를 수정하므로 실제 편집은 순차 병합 필요)
- **T010, T015** — 서로 다른 User Story의 독립 시나리오로 병렬 작성 가능
- **T027, T028** — 서로 다른 대상(문서 / DB)이라 완전 병렬 가능

---

## Parallel Example: 남은 테스트 보강

```bash
# T008 완료 후, TC-API-001 미커버 시나리오를 함께 작성:
Task: "TC-API-001 001-10 position 맨 위 배치 검증 (T010)"
Task: "TC-API-001 001-11 startedAt/completedAt/description null 검증 (T015)"
Task: "TC-API-001 001-4/001-5 빈 제목·공백 제목 검증 (T020, T021)"
Task: "TC-API-001 001-7 설명 1000자 초과 검증 (T022)"
```

---

## Implementation Strategy

### 권장 순서 (남은 작업 기준)

1. **T008** — 테스트 격리 확보 (다른 모든 테스트 작업의 전제)
2. **T025 → T026** — Constitution Gate FAIL 해소 (구조적 부채, 후속 기능이 반복 복제하기 전에 처리)
3. **T010, T015, T020~T023** — TC-API-001 커버리지를 11/11로 완성
4. **T027, T028** — 문서 정합성 및 개발 DB 정리
5. **T029** — 전체 검증

### 최소 범위로 끊고 싶다면

T008 + T025 + T026까지만 해도 "constitution 준수 + 테스트 신뢰성 회복"이라는 가장 큰 두 가지 문제가
해결된다. 커버리지 보강(T010, T015, T020~T023)은 그다음 단계로 미뤄도 기능 동작에는 영향이 없다.

---

## Notes

- `[X]` = 커밋 `245564c` 시점에 이미 완료된 작업
- `[P]` = 서로 다른 관심사라 병렬 작업 가능 (동일 파일 편집 시에는 순차 병합)
- 신규 테스트는 이미 동작하는 구현을 검증하므로 즉시 통과가 예상됨 — 예상과 달리 실패하면
  테스트가 아니라 구현을 고친다
- 삭제/정리 작업(T028)은 실행 전 사용자 승인 필수 (constitution Guardrails)
- 각 태스크 또는 논리적 그룹 완료 후 커밋
