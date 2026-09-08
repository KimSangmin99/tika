# Implementation Plan: 티켓 생성 (Create Ticket)

**Branch**: `001-create-ticket` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-create-ticket/spec.md`

## Summary

`POST /api/tickets`가 `docs/API_SPEC.md` §1 계약을 정확히 따르도록, Zod 검증(`src/shared/validations`)
→ 얇은 Route Handler(`app/api/tickets/route.ts`) → Service 레이어(`src/server/services/ticketService.ts`)
→ Drizzle ORM(`src/server/db`) 순서로 계층을 분리한다.

> **참고**: 이 기능은 이미 구현·테스트 완료 상태다 (TC-API-001 테스트 6개 통과, `245564c` 커밋).
> 이 plan.md는 새로 처음부터 설계하는 문서가 아니라, 실제 구현이 따른 아키텍처를 SDD 형식으로
> 문서화하고, 그 과정에서 발견된 constitution 위반 1건(아래 Constitution Check 참고)을 명시적으로
> 남겨 `/speckit-tasks`에서 해소하도록 하는 목적이다.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict mode), Node.js ≥20 (Vercel Serverless Functions 런타임)

**Primary Dependencies**: Next.js 15(App Router Route Handlers), Zod 3.x, Drizzle ORM 0.45.x,
`pg`(node-postgres) 8.x — 로컬/테스트 환경에서 `@vercel/postgres` 대신 사용
(Neon 전용 HTTP 프로토콜이라 로컬 Postgres 접속 불가, `src/server/db/index.ts` 참조)

**Storage**: PostgreSQL — 로컬 `tika_dev`/`tika_test`, 배포 시 Vercel Postgres(Neon)

**Testing**: Jest 29 (`next/jest`, `testEnvironment: 'node'`) — `__tests__/api/tickets.test.ts`가
Route Handler의 `POST` 함수를 표준 `Request`/`Response`로 직접 호출해 검증

**Target Platform**: Vercel Serverless Functions (배포) / Next.js dev server (로컬)

**Project Type**: web-service — 하나의 Next.js 프로젝트 안에서 `app/api`(백엔드 진입점)와
`src/client`(프론트엔드)를 디렉터리 수준으로 분리 (이 기능은 백엔드만 해당)

**Performance Goals**: API 응답 300ms 이내 p95 (docs/REQUIREMENTS.md NFR-001)

**Constraints**: 인증 없음(단일 사용자 MVP) · position은 서버가 재계산(클라이언트 값 불신) ·
`startedAt`/`completedAt`은 이 API로 설정 불가(항상 null로 생성) · 에러 응답 형식 통일
(`{ error: { code, message } }`, docs/API_SPEC.md 공통 규칙)

**Scale/Scope**: 단일 사용자, 소규모 데이터셋 (개인용 칸반 보드) — 이 계획은 7개 엔드포인트 중
`POST /api/tickets` 하나(spec.md 001-create-ticket의 범위)만 다룬다

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 상태 | 근거 |
|---|---|---|
| I. Specification-Driven Development | PASS | `specs/001-create-ticket/spec.md`가 입력이며, 실제 구현이 이를 벗어나지 않음 |
| II. Type Safety (NON-NEGOTIABLE) | PASS | `tsconfig.json` `strict: true`, `any` 미사용, `npx tsc --noEmit` 클린 확인됨 |
| III. Contract-First API Design | PASS | `docs/API_SPEC.md` §1 요청/응답 형식과 `app/api/tickets/route.ts` 동작이 TC-API-001 테스트로 일치 확인됨 |
| IV. Validated Inputs, Safe Outputs | PASS | `createTicketSchema`(Zod)로 Route Handler 진입 시 검증, Drizzle `.returning()`의 타입 있는 결과를 그대로 응답 |
| V. Separation of Concerns | PASS | Route Handler는 파싱→서비스 호출→응답만; position 계산·INSERT는 `ticketService.create()`에 위치 |
| VI. Test-Driven Development | PASS | TC-API-001 테스트가 먼저 작성돼 전부 실패(Red)한 뒤, 최소 구현으로 통과(Green) — 커밋 이력으로 확인됨 |
| Single Source of Truth (타입은 `src/shared/types/`) | **PASS** (T025·T026으로 해소) | 최초 점검 시 FAIL이었음 — `src/shared/types/index.ts`가 비어 있었음(`.gitkeep`만). `/speckit-implement`에서 `TICKET_STATUS`/`TICKET_PRIORITY`/`Ticket`을 해당 파일에 정의하고, `ticketService.create()` 반환 타입을 `Promise<Ticket>`으로 명시해 해소함 |
| No Direct Database Access from Frontend | PASS (해당 없음) | 이 기능은 백엔드 전용, `src/client/`는 관여하지 않음 |

**Gate 위반 처리**: "Single Source of Truth" 위반은 사소하지만 실재하며, 앞으로 추가될 모든 기능
(GET/PATCH/DELETE 등)이 같은 패턴을 반복하면 타입 정의가 여러 곳에 흩어진다. Complexity Tracking으로
넘기지 않고, Phase 1 산출물(`data-model.md`)에서 해소 방향을 명시하고 `/speckit-tasks`에서 실제
태스크로 반영한다 (재작업 범위가 작아 "정당화하고 넘어가기"보다 "지금 바로잡기"가 더 저렴함).

### Post-Phase-1 재점검

`data-model.md`에서 `src/shared/types/index.ts`가 가져야 할 정확한 내용(`TICKET_STATUS`,
`TICKET_PRIORITY`, `Ticket`)과 `ticketService.create()`의 반환 타입 수정 범위까지 설계했다.
설계 시점에는 코드 미변경이라 Gate가 FAIL이었다.

### Post-Implement 최종 상태 (2026-09-08)

`/speckit-implement`로 T025·T026을 실행해 **모든 Gate가 PASS**로 전환됐다.

구현 중 확정한 설계 보완 1건: DB는 `docs/DATA_MODEL.md` §2 결정대로 `VARCHAR`를 유지하되,
Drizzle 스키마에서 `$type<TicketStatus>()`/`$type<TicketPriority>()`로 표기해 애플리케이션 계층이
좁은 union을 보도록 했다. 타입 전용 표기라 생성 SQL은 불변이며(`db:generate` 결과 "No schema
changes"로 확인), 서비스 곳곳에 타입 단언을 흩뿌리지 않고 경계 한 곳에서 해결된다.

## Project Structure

### Documentation (this feature)

```text
specs/001-create-ticket/
├── plan.md              # 이 파일
├── research.md          # Phase 0 산출물
├── data-model.md         # Phase 1 산출물
├── quickstart.md         # Phase 1 산출물
├── contracts/            # Phase 1 산출물
│   └── post-tickets.md
└── tasks.md              # Phase 2 산출물 (/speckit-tasks, 이 명령이 만들지 않음)
```

### Source Code (repository root)

Tika는 템플릿의 Option 1/2/3 어느 것과도 다른, "하나의 Next.js 프로젝트 안에서 디렉터리 수준으로
프론트/백엔드를 분리"하는 구조를 쓴다 (`docs/TRD.md` §1.3, `CLAUDE.md`). 이 기능이 실제로 건드리는
파일만 표시:

```text
app/api/tickets/
└── route.ts                        # POST 진입점 — 파싱 → 서비스 호출 → 응답만 (얇게 유지)

src/server/
├── services/ticketService.ts       # create(): position 계산 + INSERT (비즈니스 로직)
└── db/
    ├── schema.ts                   # tickets 테이블 정의 (Drizzle)
    └── index.ts                    # pg Pool + drizzle() 클라이언트

src/shared/
├── validations/ticket.ts           # createTicketSchema (Zod) — 프론트/백엔드 공유
└── types/index.ts                  # ⚠ 아직 없음 — Constitution Check FAIL 항목, Phase 1에서 설계

__tests__/api/tickets.test.ts       # TC-API-001 — 이미 작성·통과 완료 (Red→Green 끝난 상태)
```

**Structure Decision**: 기존 4단계 요청 흐름(Component → Hook → ticketApi.ts → Route Handler →
ticketService → Drizzle → DB, `CLAUDE.md` "아키텍처: 요청 처리 흐름")을 그대로 따른다. 이 기능은
프론트엔드 계층(Component/Hook/ticketApi.ts)을 건드리지 않는 백엔드 전용 변경이므로 위 표에서 생략함.

## Complexity Tracking

> 정당화가 필요한 constitution 위반 없음 — 위에서 발견한 유일한 위반(Single Source of Truth)은
> "정당화 후 진행"이 아니라 Phase 1에서 직접 해소하는 쪽을 선택했으므로 이 표는 비워둔다.
