/**
 * TC-API-006: DELETE /api/tickets/:id — 티켓 삭제
 * 근거: docs/API_SPEC.md §6, docs/TEST_CASES.md TC-API-006
 */
import { DELETE, GET } from '../../app/api/tickets/[id]/route';
import { db, pool } from '@/server/db';
import { tickets } from '@/server/db/schema';

type ErrorResponse = { error: { code: string; message: string } };

function callDelete(id: string) {
  return DELETE(new Request(`http://localhost/api/tickets/${id}`, { method: 'DELETE' }), {
    params: Promise.resolve({ id }),
  });
}

function callGet(id: string) {
  return GET(new Request(`http://localhost/api/tickets/${id}`), {
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

describe('DELETE /api/tickets/:id', () => {
  // 006-1
  test('삭제하면 204를 반환하고 재조회 시 404가 된다', async () => {
    const [seed] = await db
      .insert(tickets)
      .values({ title: '삭제 대상', status: 'BACKLOG', position: 0 })
      .returning();

    const response = await callDelete(String(seed!.id));

    expect(response.status).toBe(204);

    const reread = await callGet(String(seed!.id));
    expect(reread.status).toBe(404);
  });

  // 006-2
  test('존재하지 않는 티켓을 삭제하면 404를 반환한다', async () => {
    const response = await callDelete('999999');
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('TICKET_NOT_FOUND');
    expect(body.error.message).toBe('티켓을 찾을 수 없습니다');
  });

  test('id 형식이 잘못되면 400을 반환한다', async () => {
    const response = await callDelete('abc');
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
