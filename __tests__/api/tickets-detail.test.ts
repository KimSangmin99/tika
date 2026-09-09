/**
 * TC-API-003: GET /api/tickets/:id — 티켓 상세 조회
 * 근거: docs/API_SPEC.md §3, docs/TEST_CASES.md TC-API-003
 */
import { GET } from '../../app/api/tickets/[id]/route';
import { db, pool } from '@/server/db';
import { tickets } from '@/server/db/schema';

type TicketDetail = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  position: number;
  plannedStartDate: string | null;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
};

type ErrorResponse = { error: { code: string; message: string } };

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Next.js 15 App Router는 동적 파라미터를 Promise로 전달한다 */
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

describe('GET /api/tickets/:id', () => {
  // 003-1
  test('존재하는 티켓을 조회하면 200과 전체 데이터를 반환한다', async () => {
    const [created] = await db
      .insert(tickets)
      .values({
        title: '상세 조회 대상',
        description: '설명',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        position: 0,
        plannedStartDate: dateOffset(1),
        dueDate: dateOffset(5),
      })
      .returning();

    const response = await callGet(String(created!.id));
    const body = (await response.json()) as TicketDetail;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: created!.id,
      title: '상세 조회 대상',
      description: '설명',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      plannedStartDate: dateOffset(1),
      dueDate: dateOffset(5),
    });
    expect(body).toHaveProperty('startedAt');
    expect(body).toHaveProperty('completedAt');
    expect(body).toHaveProperty('createdAt');
    expect(body).toHaveProperty('updatedAt');
  });

  // 003-2
  test('존재하지 않는 id면 404와 "티켓을 찾을 수 없습니다"를 반환한다', async () => {
    const response = await callGet('999999');
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('TICKET_NOT_FOUND');
    expect(body.error.message).toBe('티켓을 찾을 수 없습니다');
  });

  // 003-3
  test('id 형식이 잘못되면 400과 VALIDATION_ERROR를 반환한다', async () => {
    const response = await callGet('abc');
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // 003-4
  test('응답에 isOverdue 파생 필드가 포함된다', async () => {
    const [created] = await db
      .insert(tickets)
      .values({ title: '지연 티켓', status: 'TODO', position: 0, dueDate: dateOffset(-1) })
      .returning();

    const response = await callGet(String(created!.id));
    const body = (await response.json()) as TicketDetail;

    expect(response.status).toBe(200);
    expect(body.isOverdue).toBe(true);
  });
});
