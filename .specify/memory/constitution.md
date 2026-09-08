<!--
Sync Impact Report
Version change: [TEMPLATE] → 1.0.0 (initial ratification)
Modified principles: N/A (first concrete version, replacing all placeholder tokens)
Added sections:
  - Core Principles: I. TypeScript Strict Mode (NON-NEGOTIABLE), II. API Contract Fidelity,
    III. Uniform Error Response, IV. Request Validation via Zod, V. Business Logic Isolation
  - Architecture & Layer Boundaries (Section 2)
  - Development Workflow (Section 3)
  - Governance
Removed sections: none
Templates requiring follow-up:
  - .specify/templates/plan-template.md — ⚠ pending manual review (Constitution Check gate should
    cite these 5 principles by name)
  - .specify/templates/spec-template.md — ✅ no direct dependency on principle names
  - .specify/templates/tasks-template.md — ✅ no direct dependency on principle names
  - CLAUDE.md — ✅ already aligned; this constitution formalizes rules CLAUDE.md already documents
    (TRD.md §4 경계 규칙, TDD 사이클 규칙)
Follow-up TODOs: none
-->

# Tika Constitution

## Core Principles

### I. TypeScript Strict Mode (NON-NEGOTIABLE)
The entire codebase MUST compile under `tsconfig.json`'s `strict: true`. The `any` type MUST NOT
be used; where a value's type is genuinely unknown, use `unknown` and narrow it with a type guard
before use. Shared contracts (`Ticket`, `BoardData`, API input/output types) MUST be imported from
`src/shared/types`, never redeclared locally.
Rationale: Tika is a single-maintainer MVP with no dedicated QA stage — compile-time type checking
is the primary defense against contract drift between `src/shared`, `src/server`, and `src/client`.

### II. API Contract Fidelity
Every Route Handler response — success and error alike — MUST conform exactly to the shapes
defined in `docs/API_SPEC.md`: field names, JSON structure, and HTTP status codes (200, 201, 204,
400, 404, 500 only, per endpoint as specified). If an implementation need diverges from
`docs/API_SPEC.md`, the doc MUST be updated first, then the code.
Rationale: `docs/API_SPEC.md` is the single source of truth shared by frontend and backend; silent
drift breaks `src/client/api/ticketApi.ts`'s assumptions and defeats a spec-first workflow.

### III. Uniform Error Response
All error responses MUST use exactly `{ error: { code, message } }`. `code` MUST be one of
`VALIDATION_ERROR`, `TICKET_NOT_FOUND`, or `INTERNAL_ERROR` as defined in `docs/API_SPEC.md`. No
endpoint may introduce an ad-hoc error shape or a new error code without updating
`docs/API_SPEC.md` first.
Rationale: a single client-side error handler can parse every failure once, instead of per-endpoint
special-casing.

### IV. Request Validation via Zod
Every Route Handler MUST validate its request body with a Zod schema from
`src/shared/validations` before calling any service function. The same schema MUST be reused by
the corresponding frontend form as first-pass validation. Hand-written validation (ad-hoc `if`
checks in place of a feasible Zod schema) is prohibited.
Rationale: keeps the definition of "valid" in exactly one place and guarantees the frontend's UX
feedback and the backend's trust-boundary check never disagree (TRD.md §1.2).

### V. Business Logic Isolation
Business logic — derived-field computation (e.g. `isOverdue`), automatic field management
(`startedAt`/`completedAt`), position recalculation, and all DB queries — MUST live in
`src/server/services/`. Route Handlers (`app/api/**/route.ts`) are limited to: parse the request →
call a service function → shape the response. Route Handlers MUST NOT contain business logic or
call Drizzle directly.
Rationale: keeps the HTTP-facing layer thin, and keeps business logic testable independent of the
Next.js request/response machinery.

## Architecture & Layer Boundaries

- The 4-layer request flow MUST be followed without skipping a layer: Component → `useTickets`
  Hook → `ticketApi.ts` (fetch) → Route Handler (`app/api/`) → `ticketService`
  (`src/server/services`) → Drizzle ORM (`src/server/db`) → Postgres.
- `src/client/` MUST NOT import anything from `src/server/`, and `src/server/` MUST NOT import
  anything from `src/client/`. Both may import only from `src/shared/`.
- All database access MUST go through Drizzle ORM inside `src/server/services`; raw SQL is
  prohibited.
- All frontend API calls MUST go through the single module `src/client/api/ticketApi.ts` — no
  component or hook may call `fetch` directly.

## Development Workflow

- Tests MUST be written before implementation (TDD, Red → Green → Refactor). In Red, only test
  code is written. In Green, only the minimum code needed to pass. In Refactor, no new features are
  added and tests MUST stay green. A failing test is fixed by changing the implementation, never by
  editing the test — unless the test itself encodes a spec error, in which case `docs/` is
  corrected first.
- New feature work SHOULD follow the SDD procedure (`/speckit-specify` → `/speckit-plan` →
  `/speckit-tasks` → `/speckit-implement`) as a process scaffold, but `docs/*.md` remains the
  authoritative spec source for this project; where `specs/` and `docs/` disagree, `docs/` wins.
- Committed test code MUST NOT be deleted or skipped to make a build or CI run pass.

## Governance

This constitution supersedes ad-hoc conventions and prior undocumented practice. `CLAUDE.md`
carries day-to-day operational detail (directory layout, tech stack versions, business rules); this
constitution carries the non-negotiable principles `CLAUDE.md` and all implementation work must
stay consistent with.

Amendments require: (1) a written rationale for the change, (2) a version bump following semantic
versioning — MAJOR for removing or redefining a principle, MINOR for adding or materially expanding
a principle/section, PATCH for wording clarifications — and (3) an updated Sync Impact Report at
the top of this file. `/speckit-plan` and `/speckit-implement` runs MUST verify compliance with
these principles before proceeding; a plan that cannot comply MUST document the deviation and its
justification rather than silently violating a principle.

**Version**: 1.0.0 | **Ratified**: 2026-09-07 | **Last Amended**: 2026-09-07
