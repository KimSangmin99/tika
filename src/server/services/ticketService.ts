import { and, asc, eq, ne } from 'drizzle-orm';
import { db } from '@/server/db';
import { tickets } from '@/server/db/schema';
import {
  TICKET_STATUS,
  type BoardData,
  type Ticket,
  type TicketStatus,
  type TicketWithMeta,
} from '@/shared/types';
import type {
  CreateTicketInput,
  ReorderTicketInput,
  UpdateTicketInput,
} from '@/shared/validations/ticket';

const DONE_VISIBLE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** docs/DATA_MODEL.md §5.5 — position은 1024 간격 정수로 관리한다 */
const POSITION_GAP = 1024;

/** docs/DATA_MODEL.md §5.3 — dueDate가 오늘보다 이전이고 DONE이 아니면 오버듀 */
function isOverdue(ticket: Ticket): boolean {
  if (!ticket.dueDate) return false;
  if (ticket.status === TICKET_STATUS.DONE) return false;
  return ticket.dueDate < new Date().toISOString().slice(0, 10);
}

/** docs/DATA_MODEL.md §5.4 — DONE은 완료 후 24시간 이내만 보드에 노출 */
function isVisibleOnBoard(ticket: Ticket): boolean {
  if (ticket.status !== TICKET_STATUS.DONE) return true;
  if (!ticket.completedAt) return false;
  return Date.now() - ticket.completedAt.getTime() <= DONE_VISIBLE_WINDOW_MS;
}

function withMeta(ticket: Ticket): TicketWithMeta {
  return { ...ticket, isOverdue: isOverdue(ticket) };
}

// docs/DATA_MODEL.md §5.5 position 관리: 신규 티켓은 해당 칼럼의 min(position) - 1024 (맨 위 배치)
export async function create(input: CreateTicketInput): Promise<Ticket> {
  const position = await topPositionOf(TICKET_STATUS.BACKLOG);

  const [ticket] = await db
    .insert(tickets)
    .values({
      title: input.title,
      description: input.description,
      priority: input.priority,
      position,
      plannedStartDate: input.plannedStartDate,
      dueDate: input.dueDate,
    })
    .returning();

  // INSERT ... RETURNING은 성공 시 항상 1행을 돌려주므로 실제로는 발생하지 않는다.
  // noUncheckedIndexedAccess 하에서 undefined를 좁히기 위한 가드다.
  if (!ticket) {
    throw new Error('티켓 생성에 실패했습니다');
  }

  return ticket;
}

/**
 * docs/API_SPEC.md §4 — 전송된 필드만 부분 수정.
 * status/position/startedAt/completedAt은 수정 대상이 아니다(스키마에 없음).
 */
export async function update(
  id: number,
  input: UpdateTicketInput
): Promise<TicketWithMeta | null> {
  const patch: Partial<typeof tickets.$inferInsert> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.plannedStartDate !== undefined) patch.plannedStartDate = input.plannedStartDate;
  if (input.dueDate !== undefined) patch.dueDate = input.dueDate;

  // 수정할 필드가 없어도 존재 여부는 확인해야 하므로 조회로 위임한다.
  if (Object.keys(patch).length === 0) {
    return findById(id);
  }

  const [ticket] = await db
    .update(tickets)
    .set(patch)
    .where(eq(tickets.id, id))
    .returning();

  return ticket ? withMeta(ticket) : null;
}

/** docs/API_SPEC.md §3 — 단건 조회. 없으면 null (Route Handler가 404로 변환) */
export async function findById(id: number): Promise<TicketWithMeta | null> {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);

  return ticket ? withMeta(ticket) : null;
}

/** 해당 칼럼 맨 위 배치용 position — docs/DATA_MODEL.md §5.5 */
async function topPositionOf(status: TicketStatus): Promise<number> {
  const [top] = await db
    .select({ position: tickets.position })
    .from(tickets)
    .where(eq(tickets.status, status))
    .orderBy(asc(tickets.position))
    .limit(1);

  return top ? top.position - POSITION_GAP : 0;
}

/**
 * docs/API_SPEC.md §5 — DONE으로 이동하며 completedAt을 현재 시각으로 설정.
 * DONE으로 가는 이동은 이 API만 사용한다(reorder는 DONE을 허용하지 않음).
 */
export async function complete(id: number): Promise<TicketWithMeta | null> {
  const [ticket] = await db
    .update(tickets)
    .set({
      status: TICKET_STATUS.DONE,
      completedAt: new Date(),
      position: await topPositionOf(TICKET_STATUS.DONE),
    })
    .where(eq(tickets.id, id))
    .returning();

  return ticket ? withMeta(ticket) : null;
}

/** docs/API_SPEC.md §6 — 하드 삭제. 삭제된 행이 없으면 false */
export async function remove(id: number): Promise<boolean> {
  const deleted = await db.delete(tickets).where(eq(tickets.id, id)).returning({ id: tickets.id });

  return deleted.length > 0;
}

/**
 * docs/API_SPEC.md §7 — 드래그앤드롭에 의한 상태/순서 변경.
 * input.position은 대상 칼럼 내 삽입 위치(0-based index)로 해석하며,
 * 실제 position 값은 서버가 재계산한다(클라이언트 값을 그대로 신뢰하지 않음).
 */
export async function reorder(
  input: ReorderTicketInput
): Promise<{ ticket: TicketWithMeta; affected: { id: number; position: number }[] } | null> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(tickets)
      .where(eq(tickets.id, input.ticketId))
      .limit(1);

    if (!current) return null;

    // 대상 칼럼의 다른 티켓들 (이동 대상 제외), position 오름차순
    const others = await tx
      .select()
      .from(tickets)
      .where(and(eq(tickets.status, input.status), ne(tickets.id, input.ticketId)))
      .orderBy(asc(tickets.position));

    const index = Math.min(Math.max(input.position, 0), others.length);
    const prev = index > 0 ? others[index - 1] : undefined;
    const next = index < others.length ? others[index] : undefined;

    let position: number;
    const affected: { id: number; position: number }[] = [];

    if (!prev && !next) {
      position = 0;
    } else if (!prev && next) {
      position = next.position - POSITION_GAP;
    } else if (prev && !next) {
      position = prev.position + POSITION_GAP;
    } else if (prev && next && next.position - prev.position >= 2) {
      position = Math.floor((prev.position + next.position) / 2);
    } else {
      // 간격이 부족하다 — 칼럼 전체를 POSITION_GAP 간격으로 재정렬한다.
      const ordered = [...others.slice(0, index), null, ...others.slice(index)];
      position = (index + 1) * POSITION_GAP;

      for (const [i, row] of ordered.entries()) {
        if (row === null) continue;
        const newPosition = (i + 1) * POSITION_GAP;
        await tx.update(tickets).set({ position: newPosition }).where(eq(tickets.id, row.id));
        affected.push({ id: row.id, position: newPosition });
      }
    }

    // docs/DATA_MODEL.md §5.1 / §5.2 — 시스템 전용 필드 자동 관리
    const patch: Partial<typeof tickets.$inferInsert> = { status: input.status, position };

    if (input.status === TICKET_STATUS.BACKLOG) {
      patch.startedAt = null; // BACKLOG는 아직 시작 전
    } else if (input.status === TICKET_STATUS.TODO && current.status !== TICKET_STATUS.TODO) {
      patch.startedAt = new Date();
    }

    if (current.status === TICKET_STATUS.DONE) {
      patch.completedAt = null; // DONE에서 이탈하면 완료 기록을 지운다
    }

    const [updated] = await tx
      .update(tickets)
      .set(patch)
      .where(eq(tickets.id, input.ticketId))
      .returning();

    if (!updated) return null;

    return { ticket: withMeta(updated), affected };
  });
}

/** docs/API_SPEC.md §2 — 4개 칼럼별 그룹화, 칼럼 내 position 오름차순 */
export async function getBoard(): Promise<{ board: BoardData; total: number }> {
  const rows = await db.select().from(tickets).orderBy(asc(tickets.position));

  const board: BoardData = {
    BACKLOG: [],
    TODO: [],
    IN_PROGRESS: [],
    DONE: [],
  };

  let total = 0;
  for (const row of rows) {
    if (!isVisibleOnBoard(row)) continue;
    board[row.status].push(withMeta(row));
    total += 1;
  }

  return { board, total };
}
