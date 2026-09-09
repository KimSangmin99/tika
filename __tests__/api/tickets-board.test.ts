/**
 * TC-API-002: GET /api/tickets — 보드 조회
 * TC-API-008: isOverdue 파생 필드 계산
 * 근거: docs/API_SPEC.md §2, docs/TEST_CASES.md TC-API-002 / TC-API-008
 */
import { GET } from '../../app/api/tickets/route';
import { db, pool } from '@/server/db';
import { tickets } from '@/server/db/schema';

type BoardTicket = {
  id: number;
  title: string;
  status: string;
  priority: string;
  position: number;
  plannedStartDate: string | null;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  isOverdue: boolean;
};

type BoardResponse = {
  board: {
    BACKLOG: BoardTicket[];
    TODO: BoardTicket[];
    IN_PROGRESS: BoardTicket[];
    DONE: BoardTicket[];
  };
  total: number;
};

/** YYYY-MM-DD 형식으로 오늘 기준 offset일 만큼 이동한 날짜 */
function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 현재 시각 기준 hours 시간 전 */
function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function fetchBoard(): Promise<{ status: number; body: BoardResponse }> {
  const response = await GET();
  return { status: response.status, body: (await response.json()) as BoardResponse };
}

beforeEach(async () => {
  // 보드 조회는 테이블 전체를 대상으로 하므로 각 테스트는 알려진 상태에서 시작한다.
  await db.delete(tickets);
});

afterAll(async () => {
  await db.delete(tickets);
  await pool.end();
});

describe('GET /api/tickets', () => {
  // 002-1
  test('티켓이 없으면 4개 칼럼이 모두 빈 배열이고 total은 0이다', async () => {
    const { status, body } = await fetchBoard();

    expect(status).toBe(200);
    expect(body.board.BACKLOG).toEqual([]);
    expect(body.board.TODO).toEqual([]);
    expect(body.board.IN_PROGRESS).toEqual([]);
    expect(body.board.DONE).toEqual([]);
    expect(body.total).toBe(0);
  });

  // 002-2
  test('여러 상태의 티켓이 상태별로 그룹화된다', async () => {
    await db.insert(tickets).values([
      { title: '백로그 티켓', status: 'BACKLOG', position: 0 },
      { title: '투두 티켓', status: 'TODO', position: 0 },
      { title: '진행중 티켓', status: 'IN_PROGRESS', position: 0 },
    ]);

    const { status, body } = await fetchBoard();

    expect(status).toBe(200);
    expect(body.board.BACKLOG.map((t) => t.title)).toEqual(['백로그 티켓']);
    expect(body.board.TODO.map((t) => t.title)).toEqual(['투두 티켓']);
    expect(body.board.IN_PROGRESS.map((t) => t.title)).toEqual(['진행중 티켓']);
  });

  // 002-3
  test('같은 칼럼 내 티켓은 position 오름차순으로 정렬된다', async () => {
    await db.insert(tickets).values([
      { title: '세번째', status: 'BACKLOG', position: 2048 },
      { title: '첫번째', status: 'BACKLOG', position: -1024 },
      { title: '두번째', status: 'BACKLOG', position: 1024 },
    ]);

    const { body } = await fetchBoard();

    expect(body.board.BACKLOG.map((t) => t.title)).toEqual(['첫번째', '두번째', '세번째']);
  });

  // 002-4
  test('total은 보드에 표시되는 전체 티켓 수와 같다', async () => {
    await db.insert(tickets).values([
      { title: 'A', status: 'BACKLOG', position: 0 },
      { title: 'B', status: 'TODO', position: 0 },
      { title: 'C', status: 'IN_PROGRESS', position: 0 },
    ]);

    const { body } = await fetchBoard();

    expect(body.total).toBe(3);
  });

  // 002-5
  test('완료 후 24시간이 지나지 않은 DONE 티켓은 Done 칼럼에 포함된다', async () => {
    await db.insert(tickets).values({
      title: '방금 완료',
      status: 'DONE',
      position: 0,
      completedAt: hoursAgo(1),
    });

    const { body } = await fetchBoard();

    expect(body.board.DONE.map((t) => t.title)).toEqual(['방금 완료']);
    expect(body.total).toBe(1);
  });

  // 002-6
  test('완료 후 24시간이 지난 DONE 티켓은 Done 칼럼에서 제외된다', async () => {
    await db.insert(tickets).values({
      title: '오래전 완료',
      status: 'DONE',
      position: 0,
      completedAt: hoursAgo(25),
    });

    const { body } = await fetchBoard();

    expect(body.board.DONE).toEqual([]);
    expect(body.total).toBe(0);
  });

  // 002-8
  test('모든 날짜 필드가 응답에 포함된다', async () => {
    await db.insert(tickets).values({
      title: '날짜 필드 확인',
      status: 'TODO',
      position: 0,
      plannedStartDate: dateOffset(1),
      dueDate: dateOffset(5),
      startedAt: hoursAgo(2),
    });

    const { body } = await fetchBoard();
    const ticket = body.board.TODO[0];

    expect(ticket).toBeDefined();
    expect(ticket).toHaveProperty('plannedStartDate');
    expect(ticket).toHaveProperty('dueDate');
    expect(ticket).toHaveProperty('startedAt');
    expect(ticket).toHaveProperty('completedAt');
    expect(ticket?.plannedStartDate).toBe(dateOffset(1));
    expect(ticket?.dueDate).toBe(dateOffset(5));
    expect(ticket?.startedAt).not.toBeNull();
  });
});

describe('GET /api/tickets — isOverdue 파생 필드 (TC-API-008)', () => {
  // 002-7 / 008-1
  test('종료예정일이 지난 TODO 티켓은 isOverdue가 true다', async () => {
    await db
      .insert(tickets)
      .values({ title: '지연', status: 'TODO', position: 0, dueDate: dateOffset(-1) });

    const { body } = await fetchBoard();

    expect(body.board.TODO[0]?.isOverdue).toBe(true);
  });

  // 008-2
  test('종료예정일이 지났어도 DONE 티켓은 isOverdue가 false다', async () => {
    await db.insert(tickets).values({
      title: '지연됐지만 완료',
      status: 'DONE',
      position: 0,
      dueDate: dateOffset(-1),
      completedAt: hoursAgo(1),
    });

    const { body } = await fetchBoard();

    expect(body.board.DONE[0]?.isOverdue).toBe(false);
  });

  // 008-3
  test('종료예정일이 없으면 isOverdue가 false다', async () => {
    await db
      .insert(tickets)
      .values({ title: '마감 없음', status: 'TODO', position: 0, dueDate: null });

    const { body } = await fetchBoard();

    expect(body.board.TODO[0]?.isOverdue).toBe(false);
  });

  // 008-4
  test('종료예정일이 미래면 isOverdue가 false다', async () => {
    await db
      .insert(tickets)
      .values({ title: '여유 있음', status: 'TODO', position: 0, dueDate: dateOffset(3) });

    const { body } = await fetchBoard();

    expect(body.board.TODO[0]?.isOverdue).toBe(false);
  });

  // 008-5
  test('종료예정일이 오늘이면 아직 초과가 아니므로 isOverdue가 false다', async () => {
    await db
      .insert(tickets)
      .values({ title: '오늘 마감', status: 'TODO', position: 0, dueDate: dateOffset(0) });

    const { body } = await fetchBoard();

    expect(body.board.TODO[0]?.isOverdue).toBe(false);
  });

  // 008-6
  test('종료예정일이 지난 BACKLOG 티켓은 isOverdue가 true다', async () => {
    await db
      .insert(tickets)
      .values({ title: '백로그 지연', status: 'BACKLOG', position: 0, dueDate: dateOffset(-2) });

    const { body } = await fetchBoard();

    expect(body.board.BACKLOG[0]?.isOverdue).toBe(true);
  });

  // 008-7
  test('종료예정일이 지난 IN_PROGRESS 티켓은 isOverdue가 true다', async () => {
    await db
      .insert(tickets)
      .values({ title: '진행중 지연', status: 'IN_PROGRESS', position: 0, dueDate: dateOffset(-2) });

    const { body } = await fetchBoard();

    expect(body.board.IN_PROGRESS[0]?.isOverdue).toBe(true);
  });
});
