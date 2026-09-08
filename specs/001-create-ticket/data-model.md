# Phase 1 Data Model: 티켓 생성 (Create Ticket)

## Entity: Ticket

`docs/DATA_MODEL.md` §2, §4 기준. 이 기능(생성)이 실제로 채우는 필드만 "생성 시 값"에 표시.

| 필드 | 타입 | 생성 시 값 | 검증 규칙 |
|---|---|---|---|
| `id` | `number` | DB가 자동 부여 (serial) | — |
| `title` | `string` | 사용자 입력 | 1~200자, 공백만인 값 불가 |
| `description` | `string \| null` | 사용자 입력 (선택) | 최대 1000자, 미입력 시 `null` |
| `status` | `TicketStatus` | 항상 `'BACKLOG'` | 사용자가 지정 불가 — 서버가 고정 |
| `priority` | `TicketPriority` | 사용자 입력 (선택) | `LOW \| MEDIUM \| HIGH`, 미입력 시 `'MEDIUM'` |
| `position` | `number` | 서버 계산: `min(BACKLOG 칼럼 position) - 1024` | 클라이언트가 보낼 수 없는 필드(입력 타입에 없음) |
| `plannedStartDate` | `string \| null` (YYYY-MM-DD) | 사용자 입력 (선택) | 형식 검증만, 과거/미래 제약 없음 |
| `dueDate` | `string \| null` (YYYY-MM-DD) | 사용자 입력 (선택) | 오늘 포함 이후 날짜만 허용 (spec.md 확정 사항) |
| `startedAt` | `Date \| null` | 항상 `null` | 사용자가 지정 불가 — TODO 이동 시 별도 기능이 설정 |
| `completedAt` | `Date \| null` | 항상 `null` | 사용자가 지정 불가 — 완료 처리 별도 기능이 설정 |
| `createdAt` | `Date` | DB가 자동 부여 (`now()`) | — |
| `updatedAt` | `Date` | DB가 자동 부여 (`now()`) | — |

**상태 전이**: 이 기능은 티켓의 "생성"만 다루며, 생성된 티켓은 항상 `BACKLOG` 상태로 시작한다.
그 이후의 상태 전이(TODO/IN_PROGRESS/DONE 이동)는 이 스펙의 범위가 아니다 (FR-007, 별도 스펙).

## Contract-level types

Route Handler가 검증에 사용하는 입력 타입:

```typescript
// src/shared/validations/ticket.ts (기존)
export const createTicketSchema = z.object({
  title: z.string().min(1).max(200).refine(...),
  description: z.string().max(1000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  plannedStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(오늘_포함_이후).optional(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
```

## 설계 결정: `src/shared/types/index.ts` (Constitution Check FAIL 해소)

`research.md` §5에서 확인한 대로, `docs/DATA_MODEL.md`와 `CLAUDE.md`는 공유 타입이
`src/shared/types/index.ts`에 있어야 한다고 명시하지만 현재 그 파일은 비어 있다.

**이 기능이 책임지는 범위만** 다음 3가지를 `src/shared/types/index.ts`에 새로 정의한다 (전체
`docs/DATA_MODEL.md` §4의 모든 타입을 한 번에 옮기지 않음 — `BoardData`/`TicketWithMeta`는 보드
조회 기능(FR-002)의 스펙에서, `UpdateTicketInput`/`ReorderTicketInput`은 각각의 스펙에서 추가):

```typescript
// src/shared/types/index.ts (신규)
export const TICKET_STATUS = {
  BACKLOG: 'BACKLOG',
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
} as const;
export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

export const TICKET_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;
export type TicketPriority = (typeof TICKET_PRIORITY)[keyof typeof TICKET_PRIORITY];

export interface Ticket {
  id: number;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  position: number;
  plannedStartDate: string | null;
  dueDate: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

그리고 `src/shared/validations/ticket.ts`의 `CreateTicketInput`은 `z.infer`로 유지하되(Zod가
검증 규칙의 단일 소스이므로), `src/server/services/ticketService.ts`의 함수 시그니처가 반환하는
값은 `Ticket`(`@/shared/types`)로 타입을 명시해 "검증 입력 타입"과 "도메인 타입"을 구분한다.

**변경 대상 파일** (`/speckit-tasks`가 태스크로 분해):
- `src/shared/types/index.ts` — 위 내용으로 신규 작성
- `src/server/services/ticketService.ts` — `create()` 반환 타입을 `Promise<Ticket>`으로 명시
- 기존 테스트(`__tests__/api/tickets.test.ts`)는 이미 통과 중이므로 **수정하지 않음** — 이 변경은
  타입 표기 강화일 뿐 런타임 동작을 바꾸지 않는다 (Refactor 성격, TDD 사이클의 Refactor 단계 규칙
  적용: 테스트는 계속 그대로 통과해야 함)
