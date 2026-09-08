/**
 * TC-API-001: POST /api/tickets — 티켓 생성
 * 근거: docs/API_SPEC.md §1 (POST /api/tickets), docs/TEST_CASES.md TC-API-001
 *
 * 이 테스트는 실제 로컬 Postgres(tika_test)에 기록한다. 생성된 행은 afterEach에서
 * id를 특정해 삭제하고(무조건 삭제 금지 — constitution Guardrails), afterAll에서
 * 커넥션 풀을 닫는다.
 */
import { inArray } from 'drizzle-orm';
import { POST } from '../../app/api/tickets/route';
import { db, pool } from '@/server/db';
import { tickets } from '@/server/db/schema';

type TicketResponse = {
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
};

type ErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

function createRequest(body: unknown): Request {
  return new Request('http://localhost/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** 이 테스트가 생성한 티켓 id — afterEach에서 이 id들만 골라 삭제한다. */
const createdIds: number[] = [];

/** 생성 성공 응답을 받아 정리 대상으로 등록하고, 그대로 돌려준다. */
function trackForCleanup(ticket: TicketResponse): TicketResponse {
  createdIds.push(ticket.id);
  return ticket;
}

afterEach(async () => {
  if (createdIds.length === 0) return;
  await db.delete(tickets).where(inArray(tickets.id, createdIds));
  createdIds.length = 0;
});

afterAll(async () => {
  await pool.end();
});

describe('POST /api/tickets', () => {
  // TC-API-001 001-2: 전체 필드로 생성
  test('모든 필드를 포함해 생성하면 201과 함께 입력값이 그대로 반영된 티켓을 반환한다', async () => {
    const input = {
      title: 'API 설계 문서 작성',
      description: 'REST API 엔드포인트와 요청/응답 형식을 정의한다',
      priority: 'HIGH',
      plannedStartDate: '2099-01-10',
      dueDate: '2099-01-15',
    };

    const response = await POST(createRequest(input));
    const body = trackForCleanup((await response.json()) as TicketResponse);

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      title: input.title,
      description: input.description,
      status: 'BACKLOG',
      priority: input.priority,
      plannedStartDate: input.plannedStartDate,
      dueDate: input.dueDate,
      startedAt: null,
      completedAt: null,
    });
    expect(typeof body.id).toBe('number');
  });

  // TC-API-001 001-1: 제목만으로 최소 생성
  test('제목만으로 생성하면 201과 함께 priority는 MEDIUM으로 설정된다', async () => {
    const response = await POST(createRequest({ title: '테스트 할일' }));
    const body = trackForCleanup((await response.json()) as TicketResponse);

    expect(response.status).toBe(201);
    expect(body.title).toBe('테스트 할일');
    expect(body.status).toBe('BACKLOG');
    expect(body.priority).toBe('MEDIUM');
  });

  // TC-API-001 001-11 / spec.md FR-008: 시스템 전용 필드는 생성 시 항상 null
  test('제목만으로 생성하면 description/startedAt/completedAt이 모두 null이다', async () => {
    const response = await POST(createRequest({ title: '초기값 확인용 티켓' }));
    const body = trackForCleanup((await response.json()) as TicketResponse);

    expect(response.status).toBe(201);
    expect(body.description).toBeNull();
    expect(body.plannedStartDate).toBeNull();
    expect(body.dueDate).toBeNull();
    expect(body.startedAt).toBeNull();
    expect(body.completedAt).toBeNull();
  });

  // TC-API-001 001-10 / spec.md US1 인수 시나리오 2: 신규 티켓은 항상 맨 위
  test('연속으로 생성하면 나중에 만든 티켓의 position이 더 작다 (맨 위 배치)', async () => {
    const first = trackForCleanup(
      (await (await POST(createRequest({ title: '먼저 만든 티켓' }))).json()) as TicketResponse
    );
    const second = trackForCleanup(
      (await (await POST(createRequest({ title: '나중에 만든 티켓' }))).json()) as TicketResponse
    );

    expect(second.position).toBeLessThan(first.position);
  });

  // TC-API-001 001-3: 제목 누락
  test('제목이 없으면 400과 "제목을 입력해주세요" 에러를 반환한다', async () => {
    const response = await POST(createRequest({}));
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('제목을 입력해주세요');
  });

  // TC-API-001 001-4: 빈 제목
  test('제목이 빈 문자열이면 400과 "제목을 입력해주세요" 에러를 반환한다', async () => {
    const response = await POST(createRequest({ title: '' }));
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('제목을 입력해주세요');
  });

  // TC-API-001 001-5: 공백만 제목
  test('제목이 공백 문자로만 이루어지면 400과 "제목을 입력해주세요" 에러를 반환한다', async () => {
    const response = await POST(createRequest({ title: '   ' }));
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('제목을 입력해주세요');
  });

  // TC-API-001 001-7: 설명 1000자 초과
  test('설명이 1000자를 초과하면 400 에러를 반환한다', async () => {
    const response = await POST(
      createRequest({ title: '정상 제목', description: 'a'.repeat(1001) })
    );
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('설명은 1000자 이내로 입력해주세요');
  });

  // spec.md Edge Case: 경계값 — 200자는 허용, 201자부터 거부
  test('제목이 정확히 200자면 201로 생성된다 (경계값)', async () => {
    const response = await POST(createRequest({ title: 'a'.repeat(200) }));
    const body = trackForCleanup((await response.json()) as TicketResponse);

    expect(response.status).toBe(201);
    expect(body.title).toHaveLength(200);
  });

  // TC-API-001 001-6: 제목 200자 초과
  test('제목이 200자를 초과하면 400 에러를 반환한다', async () => {
    const response = await POST(createRequest({ title: 'a'.repeat(201) }));
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('제목은 200자 이내로 입력해주세요');
  });

  // TC-API-001 001-9: 과거 종료예정일
  test('종료예정일이 과거면 400 에러를 반환한다', async () => {
    const response = await POST(
      createRequest({ title: '정상 제목', dueDate: '2020-01-01' })
    );
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('종료예정일은 오늘 이후 날짜를 선택해주세요');
  });

  // TC-API-001 001-8: 잘못된 우선순위 값
  test('잘못된 우선순위 값이면 400 에러를 반환한다', async () => {
    const response = await POST(
      createRequest({ title: '정상 제목', priority: 'URGENT' })
    );
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요');
  });
});
