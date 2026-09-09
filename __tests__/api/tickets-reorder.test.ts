/**
 * TC-API-007: PATCH /api/tickets/reorder — 상태/순서 변경 (드래그앤드롭)
 * 근거: docs/API_SPEC.md §7, docs/TEST_CASES.md TC-API-007
 */
import { PATCH } from '../../app/api/tickets/reorder/route';
import { db, pool } from '@/server/db';
import { tickets } from '@/server/db/schema';

type ReorderResponse = {
  ticket: {
    id: number;
    status: string;
    position: number;
    startedAt: string | null;
    completedAt: string | null;
    updatedAt: string;
  };
  affected: { id: number; position: number }[];
};

type ErrorResponse = { error: { code: string; message: string } };

function callReorder(body: unknown) {
  return PATCH(
    new Request('http://localhost/api/tickets/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

async function seed(values: Record<string, unknown>) {
  const [row] = await db
    .insert(tickets)
    .values({ title: '테스트', position: 0, ...values } as typeof tickets.$inferInsert)
    .returning();
  return row!;
}

beforeEach(async () => {
  await db.delete(tickets);
});

afterAll(async () => {
  await db.delete(tickets);
  await pool.end();
});

describe('PATCH /api/tickets/reorder', () => {
  // 007-1
  test('칼럼 간 이동 시 status와 position이 갱신된다', async () => {
    const ticket = await seed({ status: 'BACKLOG', position: 0 });

    const response = await callReorder({ ticketId: ticket.id, status: 'TODO', position: 0 });
    const body = (await response.json()) as ReorderResponse;

    expect(response.status).toBe(200);
    expect(body.ticket.status).toBe('TODO');
  });

  // 007-2
  test('같은 칼럼 내 순서 변경 시 status는 유지되고 position만 바뀐다', async () => {
    const first = await seed({ status: 'BACKLOG', position: 0, title: '첫번째' });
    const second = await seed({ status: 'BACKLOG', position: 1024, title: '두번째' });

    // second를 first보다 위로 이동
    const response = await callReorder({ ticketId: second.id, status: 'BACKLOG', position: 0 });
    const body = (await response.json()) as ReorderResponse;

    expect(response.status).toBe(200);
    expect(body.ticket.status).toBe('BACKLOG');
    expect(body.ticket.position).toBeLessThan(first.position);
  });

  // 007-3
  test('TODO로 이동하면 startedAt이 현재 시각으로 설정된다', async () => {
    const ticket = await seed({ status: 'BACKLOG', position: 0, startedAt: null });

    const before = Date.now();
    const response = await callReorder({ ticketId: ticket.id, status: 'TODO', position: 0 });
    const body = (await response.json()) as ReorderResponse;

    expect(body.ticket.startedAt).not.toBeNull();
    expect(new Date(body.ticket.startedAt!).getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  // 007-4
  test('TODO에서 BACKLOG로 되돌리면 startedAt이 null이 된다', async () => {
    const ticket = await seed({ status: 'TODO', position: 0, startedAt: new Date() });

    const response = await callReorder({ ticketId: ticket.id, status: 'BACKLOG', position: 0 });
    const body = (await response.json()) as ReorderResponse;

    expect(body.ticket.startedAt).toBeNull();
  });

  // 007-5
  test('DONE에서 TODO로 나가면 completedAt이 null이 되고 startedAt이 설정된다', async () => {
    const ticket = await seed({ status: 'DONE', position: 0, completedAt: new Date() });

    const response = await callReorder({ ticketId: ticket.id, status: 'TODO', position: 0 });
    const body = (await response.json()) as ReorderResponse;

    expect(body.ticket.status).toBe('TODO');
    expect(body.ticket.completedAt).toBeNull();
    expect(body.ticket.startedAt).not.toBeNull();
  });

  // 007-6
  test('DONE에서 BACKLOG로 나가면 completedAt과 startedAt이 모두 null이 된다', async () => {
    const ticket = await seed({
      status: 'DONE',
      position: 0,
      completedAt: new Date(),
      startedAt: new Date(),
    });

    const response = await callReorder({ ticketId: ticket.id, status: 'BACKLOG', position: 0 });
    const body = (await response.json()) as ReorderResponse;

    expect(body.ticket.status).toBe('BACKLOG');
    expect(body.ticket.completedAt).toBeNull();
    expect(body.ticket.startedAt).toBeNull();
  });

  // 007-7
  test('TODO에서 IN_PROGRESS로 이동하면 startedAt이 유지된다', async () => {
    const startedAt = new Date(Date.now() - 3600_000);
    const ticket = await seed({ status: 'TODO', position: 0, startedAt });

    const response = await callReorder({ ticketId: ticket.id, status: 'IN_PROGRESS', position: 0 });
    const body = (await response.json()) as ReorderResponse;

    expect(body.ticket.status).toBe('IN_PROGRESS');
    expect(new Date(body.ticket.startedAt!).getTime()).toBe(startedAt.getTime());
  });

  // 007-8
  test('재정렬이 필요하면 영향받은 티켓이 affected 배열에 포함된다', async () => {
    // 간격이 1 이하로 붙어 있어 재정렬이 필요한 상태를 만든다
    const a = await seed({ status: 'TODO', position: 0, title: 'A' });
    const b = await seed({ status: 'TODO', position: 1, title: 'B' });
    const moving = await seed({ status: 'BACKLOG', position: 0, title: '이동' });

    // A와 B 사이로 삽입 시도 → 간격이 없어 칼럼 전체 재정렬 발생
    const response = await callReorder({ ticketId: moving.id, status: 'TODO', position: 1 });
    const body = (await response.json()) as ReorderResponse;

    expect(response.status).toBe(200);
    const affectedIds = body.affected.map((t) => t.id);
    expect(affectedIds).toEqual(expect.arrayContaining([a.id, b.id]));
  });

  // 007-9
  test('status로 DONE을 보내면 400을 반환한다', async () => {
    const ticket = await seed({ status: 'TODO', position: 0 });

    const response = await callReorder({ ticketId: ticket.id, status: 'DONE', position: 0 });
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // 007-10
  test('잘못된 status면 400과 안내 메시지를 반환한다', async () => {
    const ticket = await seed({ status: 'TODO', position: 0 });

    const response = await callReorder({ ticketId: ticket.id, status: 'INVALID', position: 0 });
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요');
  });

  // 007-11
  test('존재하지 않는 ticketId면 404를 반환한다', async () => {
    const response = await callReorder({ ticketId: 999999, status: 'TODO', position: 0 });
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('TICKET_NOT_FOUND');
    expect(body.error.message).toBe('티켓을 찾을 수 없습니다');
  });

  // 007-12
  test('이동하면 updatedAt이 갱신된다', async () => {
    const ticket = await seed({ status: 'BACKLOG', position: 0 });
    const past = new Date(Date.now() - 60_000);
    await db.update(tickets).set({ updatedAt: past });

    const response = await callReorder({ ticketId: ticket.id, status: 'TODO', position: 0 });
    const body = (await response.json()) as ReorderResponse;

    expect(new Date(body.ticket.updatedAt).getTime()).toBeGreaterThan(past.getTime());
  });
});
