/**
 * TC-API-004: PATCH /api/tickets/:id — 티켓 수정
 * 근거: docs/API_SPEC.md §4, docs/TEST_CASES.md TC-API-004
 */
import { PATCH } from '../../app/api/tickets/[id]/route';
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
  updatedAt: string;
};

type ErrorResponse = { error: { code: string; message: string } };

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function callPatch(id: string, body: unknown) {
  return PATCH(
    new Request(`http://localhost/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) }
  );
}

/** 수정 대상 티켓을 하나 만들어 id를 돌려준다 */
async function seedTicket(overrides: Record<string, unknown> = {}) {
  const [created] = await db
    .insert(tickets)
    .values({
      title: '원래 제목',
      description: '원래 설명',
      status: 'BACKLOG',
      priority: 'MEDIUM',
      position: 0,
      plannedStartDate: dateOffset(1),
      dueDate: dateOffset(5),
      ...overrides,
    })
    .returning();
  return created!;
}

beforeEach(async () => {
  await db.delete(tickets);
});

afterAll(async () => {
  await db.delete(tickets);
  await pool.end();
});

describe('PATCH /api/tickets/:id', () => {
  // 004-1
  test('제목만 수정하면 제목만 바뀌고 나머지는 유지된다', async () => {
    const seed = await seedTicket();

    const response = await callPatch(String(seed.id), { title: '새 제목' });
    const body = (await response.json()) as TicketDetail;

    expect(response.status).toBe(200);
    expect(body.title).toBe('새 제목');
    expect(body.description).toBe('원래 설명');
    expect(body.priority).toBe('MEDIUM');
    expect(body.dueDate).toBe(dateOffset(5));
  });

  // 004-2
  test('우선순위를 변경할 수 있다', async () => {
    const seed = await seedTicket();

    const response = await callPatch(String(seed.id), { priority: 'LOW' });
    const body = (await response.json()) as TicketDetail;

    expect(response.status).toBe(200);
    expect(body.priority).toBe('LOW');
  });

  // 004-3
  test('description을 null로 보내면 설명이 삭제된다', async () => {
    const seed = await seedTicket();

    const response = await callPatch(String(seed.id), { description: null });
    const body = (await response.json()) as TicketDetail;

    expect(response.status).toBe(200);
    expect(body.description).toBeNull();
  });

  // 004-4
  test('dueDate를 null로 보내면 종료예정일이 삭제된다', async () => {
    const seed = await seedTicket();

    const response = await callPatch(String(seed.id), { dueDate: null });
    const body = (await response.json()) as TicketDetail;

    expect(response.status).toBe(200);
    expect(body.dueDate).toBeNull();
  });

  // 004-5
  test('시작예정일을 수정할 수 있다', async () => {
    const seed = await seedTicket();

    const response = await callPatch(String(seed.id), { plannedStartDate: dateOffset(10) });
    const body = (await response.json()) as TicketDetail;

    expect(response.status).toBe(200);
    expect(body.plannedStartDate).toBe(dateOffset(10));
  });

  // 004-6
  test('plannedStartDate를 null로 보내면 시작예정일이 삭제된다', async () => {
    const seed = await seedTicket();

    const response = await callPatch(String(seed.id), { plannedStartDate: null });
    const body = (await response.json()) as TicketDetail;

    expect(response.status).toBe(200);
    expect(body.plannedStartDate).toBeNull();
  });

  // 004-7
  test('존재하지 않는 티켓을 수정하면 404를 반환한다', async () => {
    const response = await callPatch('999999', { title: '아무거나' });
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('TICKET_NOT_FOUND');
    expect(body.error.message).toBe('티켓을 찾을 수 없습니다');
  });

  // 004-8
  test('수정하면 updatedAt이 갱신된다', async () => {
    const seed = await seedTicket();
    // updatedAt 차이를 확실히 만들기 위해 과거 시각으로 되돌린다
    const past = new Date(Date.now() - 60_000);
    await db.update(tickets).set({ updatedAt: past });

    const response = await callPatch(String(seed.id), { title: '갱신 확인' });
    const body = (await response.json()) as TicketDetail;

    expect(response.status).toBe(200);
    expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(past.getTime());
  });

  // 004-9
  test('status는 이 API로 변경되지 않는다', async () => {
    const seed = await seedTicket({ status: 'BACKLOG' });

    const response = await callPatch(String(seed.id), { status: 'DONE' });
    const body = (await response.json()) as TicketDetail;

    expect(response.status).toBe(200);
    expect(body.status).toBe('BACKLOG');
  });

  // API_SPEC.md §4 — position/startedAt/completedAt도 이 API로 수정 불가
  test('position, startedAt, completedAt은 이 API로 변경되지 않는다', async () => {
    const seed = await seedTicket({ position: 1024 });

    const response = await callPatch(String(seed.id), {
      position: 9999,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });
    const body = (await response.json()) as TicketDetail;

    expect(response.status).toBe(200);
    expect(body.position).toBe(1024);
    expect(body.startedAt).toBeNull();
    expect(body.completedAt).toBeNull();
  });

  // API_SPEC.md §4 에러 — 검증 규칙은 생성과 동일
  test('제목이 200자를 초과하면 400을 반환한다', async () => {
    const seed = await seedTicket();

    const response = await callPatch(String(seed.id), { title: 'a'.repeat(201) });
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('제목은 200자 이내로 입력해주세요');
  });
});
