/**
 * TC-API-001: POST /api/tickets — 티켓 생성
 * 근거: docs/API_SPEC.md §1 (POST /api/tickets), docs/TEST_CASES.md TC-API-001
 *
 * TDD Red 단계: app/api/tickets/route.ts가 아직 존재하지 않으므로
 * 아래 import에서 모듈을 찾지 못해 이 파일의 테스트는 전부 실패한다. 정상이다.
 */
import { POST } from '../../app/api/tickets/route';

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
    const body = (await response.json()) as TicketResponse;

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
    const body = (await response.json()) as TicketResponse;

    expect(response.status).toBe(201);
    expect(body.title).toBe('테스트 할일');
    expect(body.status).toBe('BACKLOG');
    expect(body.priority).toBe('MEDIUM');
  });

  // TC-API-001 001-3: 제목 누락
  test('제목이 없으면 400과 "제목을 입력해주세요" 에러를 반환한다', async () => {
    const response = await POST(createRequest({}));
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('제목을 입력해주세요');
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
