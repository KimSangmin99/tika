# Phase 0 Research: 티켓 생성 (Create Ticket)

Technical Context에 `NEEDS CLARIFICATION`으로 남은 항목은 없다 — 이 기능은 이미 구현·테스트가 끝난
상태라, 모든 기술적 결정이 실제 코드와 기존 docs/에 이미 확정돼 있다. 이 문서는 그 결정들의
근거(Decision/Rationale/Alternatives)를 SDD 형식으로 정리한다.

## 1. DB 드라이버: `pg`(node-postgres) vs `@vercel/postgres`

- **Decision**: 로컬/테스트 환경은 `pg` + `drizzle-orm/node-postgres`를 사용한다.
- **Rationale**: `docs/TRD.md`가 지정한 `@vercel/postgres`는 Neon 전용 HTTP 프로토콜로만 접속하며,
  로컬 TCP Postgres(`tika_dev`/`tika_test`)에는 애초에 접속이 불가능하다 (`sql\`SELECT 1\`` 호출 시
  `fetch failed` 에러로 실측 확인됨). `pg`는 표준 TCP 드라이버라 로컬 Postgres에 바로 접속된다.
- **Alternatives considered**:
  - Neon Local Proxy(Docker)로 `@vercel/postgres`를 그대로 쓰기 — Docker 의존성과 인프라 복잡도가
    늘어나 MVP 규모에 비해 과함. 기각.
  - 실제 Neon 인스턴스를 로컬 개발에도 사용 — 오프라인 개발 불가, 개발/테스트 DB 격리가 어려워짐.
    기각.

## 2. 요청 검증: Zod 스키마 위치와 재사용

- **Decision**: `src/shared/validations/ticket.ts`에 `createTicketSchema`를 정의하고, Route
  Handler(`app/api/tickets/route.ts`)가 `safeParse`로 이를 호출한다.
- **Rationale**: `docs/API_SPEC.md`가 프론트(1차, UX 피드백)와 백엔드(2차, 신뢰 경계) 양쪽에서
  **동일한** Zod 스키마를 쓰도록 요구한다 (`docs/TRD.md` §1.2). `src/shared/`에 두면 두 계층이 같은
  모듈을 import할 수 있다.
- **Alternatives considered**:
  - Route Handler 안에 인라인으로 검증 로직 작성 — 프론트엔드 폼에서 재사용 불가, 백엔드/프론트
    검증 로직이 갈라질 위험. 기각 (Constitution 원칙 IV, "Validated Inputs" 위반).

## 3. 계층 분리: Route Handler vs Service

- **Decision**: `app/api/tickets/route.ts`는 "요청 파싱 → Zod 검증 → 서비스 호출 → 응답 변환"만
  수행하고, position 계산과 INSERT는 `src/server/services/ticketService.ts`의 `create()`에 둔다.
- **Rationale**: `CLAUDE.md`/`docs/TRD.md` §4가 Route Handler를 얇게 유지하도록 강제하며,
  Constitution 원칙 V(Separation of Concerns)와 정확히 일치한다. 서비스 함수 단위로 나누면 HTTP
  계층 없이도(예: 향후 CLI, 배치 작업) 같은 로직을 재사용·단위테스트할 수 있다.
- **Alternatives considered**:
  - Route Handler에서 Drizzle을 직접 호출 — `CLAUDE.md` "DB 쿼리는 Drizzle ORM으로만, Route
    Handler에 직접 작성 금지" 규칙 위반. 기각.

## 4. position 계산 시점: 서버 계산 vs 클라이언트 값 신뢰

- **Decision**: 서버(`ticketService.create()`)가 BACKLOG 칼럼의 현재 최소 `position`을 조회해
  `min(position) - 1024`로 새 값을 계산한다. 클라이언트가 `position`을 보낼 방법 자체가 없다
  (`CreateTicketInput`에 필드 없음).
- **Rationale**: `docs/DATA_MODEL.md` §5.5 "서버는 클라이언트가 보낸 position을 그대로 신뢰하지
  않고 재계산한다"를 생성 시점부터 일관되게 적용한다.
- **Alternatives considered**: 클라이언트가 원하는 위치를 제안하고 서버가 검증만 하는 방식 —
  생성은 항상 맨 위 고정이라는 명세(FR-007)와 맞지 않아 불필요한 유연성. 기각.

## 5. 타입 공유 위치: `src/shared/types` 미사용 현황 (Constitution Check FAIL의 근거)

- **Decision (문제 확인)**: 현재 `CreateTicketInput`은 `src/shared/validations/ticket.ts`에서
  `z.infer<typeof createTicketSchema>`로 지역 추론되고, `src/shared/types/index.ts`는 비어있다
  (`.gitkeep`만 존재).
- **Rationale**: `docs/DATA_MODEL.md` §4는 `Ticket`, `TicketWithMeta`, `CreateTicketInput` 등을
  `src/shared/types/index.ts`에 두도록 명시하고, `CLAUDE.md` 코딩 컨벤션도 "공유 타입은 반드시
  `@/shared/types`에서 import"라고 못박는다. 지금 구조는 이 두 문서와 모두 어긋난다.
- **Alternatives considered**:
  - 지금 이대로 두고 이번 기능 범위 밖으로 미루기 — 앞으로 GET/PATCH/DELETE/reorder 기능이
    추가될수록 같은 패턴이 반복돼 나중에 되돌리기 더 비싸진다. 기각.
  - **채택**: Phase 1(`data-model.md`)에서 `src/shared/types/index.ts`가 가져야 할 정확한 형태를
    설계하고, `/speckit-tasks`가 이를 별도 태스크로 반영해 지금 해소한다.
