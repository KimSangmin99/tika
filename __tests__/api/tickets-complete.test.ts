/**
 * TC-API-005: PATCH /api/tickets/:id/complete — 티켓 완료
 * 근거: docs/API_SPEC.md §5, docs/TEST_CASES.md TC-API-005
 */
import { PATCH } from '../../app/api/tickets/[id]/complete/route';
import { db, pool } from '@/server/db';
import { tickets } from '@/server/db/schema';

type TicketDetail = {
  id: number;
  status: string;
  position: number;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

type ErrorResponse = { error: { code: string; message: string } };

function callComplete(id: string) {
  return PATCH(new Request(`http://localhost/api/tickets/${id}/complete`, { method: 'PATCH' }), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(async () => {
  await db.delete(tickets);
});

afterAll(async () => {
  await db.delete(tickets);
  await pool.end();
});

describe('PATCH /api/tickets/:id/complete', () => {
  // 005-1
  test('완료 처리하면 200과 함께 status가 DONE이 되고 completedAt이 설정된다', async () => {
    const [seed] = await db
      .insert(tickets)
      .values({ title: '완료 대상', status: 'IN_PROGRESS', position: 0 })
      .returning();

    const response = await callComplete(String(seed!.id));
    const body = (await response.json()) as TicketDetail;

    expect(response.status).toBe(200);
    expect(body.status).toBe('DONE');
    expect(body.completedAt).not.toBeNull();
  });

  // 005-2
  test('completedAt이 현재 시각으로 설정된다', async () => {
    const [seed] = await db
      .insert(tickets)
      .values({ title: '시각 확인', status: 'TODO', position: 0 })
      .returning();

    const before = Date.now();
    const response = await callComplete(String(seed!.id));
    const body = (await response.json()) as TicketDetail;
    const after = Date.now();

    const completedAt = new Date(body.completedAt!).getTime();
    expect(completedAt).toBeGreaterThanOrEqual(before - 1000);
    expect(completedAt).toBeLessThanOrEqual(after + 1000);
  });

  // 005-3
  test('Done 칼럼 맨 위 position이 할당된다', async () => {
    await db
      .insert(tickets)
      .values({ title: '기존 완료건', status: 'DONE', position: 0, completedAt: new Date() });
    const [seed] = await db
      .insert(tickets)
      .values({ title: '새로 완료', status: 'TODO', position: 5000 })
      .returning();

    const response = await callComplete(String(seed!.id));
    const body = (await response.json()) as TicketDetail;

    expect(response.status).toBe(200);
    expect(body.position).toBeLessThan(0);
  });

  // 005-4
  test('존재하지 않는 티켓을 완료하면 404를 반환한다', async () => {
    const response = await callComplete('999999');
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('TICKET_NOT_FOUND');
    expect(body.error.message).toBe('티켓을 찾을 수 없습니다');
  });

  // 005-5
  test('완료 처리하면 updatedAt이 갱신된다', async () => {
    const [seed] = await db
      .insert(tickets)
      .values({ title: 'updatedAt 확인', status: 'TODO', position: 0 })
      .returning();
    const past = new Date(Date.now() - 60_000);
    await db.update(tickets).set({ updatedAt: past });

    const response = await callComplete(String(seed!.id));
    const body = (await response.json()) as TicketDetail;

    expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(past.getTime());
  });

  test('id 형식이 잘못되면 400을 반환한다', async () => {
    const response = await callComplete('abc');
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
