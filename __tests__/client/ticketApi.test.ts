/**
 * src/client/api/ticketApi.ts — 프론트엔드의 유일한 API 호출 창구
 * 근거: docs/API_SPEC.md, docs/COMPONENT_SPEC.md §4, CLAUDE.md 경계 규칙
 */
import {
  completeTicket,
  createTicket,
  deleteTicket,
  getBoard,
  reorderTicket,
  updateTicket,
} from '@/client/api/ticketApi';

const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

/** 성공 응답 목 */
function okResponse(body: unknown, status = 200) {
  return {
    ok: true,
    status,
    json: async () => body,
  } as Response;
}

/** 에러 응답 목 — docs/API_SPEC.md 공통 규칙 형식 */
function errorResponse(code: string, message: string, status: number) {
  return {
    ok: false,
    status,
    json: async () => ({ error: { code, message } }),
  } as Response;
}

describe('ticketApi', () => {
  test('getBoard는 GET /api/tickets를 호출하고 board를 반환한다', async () => {
    const board = { BACKLOG: [], TODO: [], IN_PROGRESS: [], DONE: [] };
    mockFetch.mockResolvedValue(okResponse({ board, total: 0 }));

    const result = await getBoard();

    expect(mockFetch).toHaveBeenCalledWith('/api/tickets', expect.objectContaining({ method: 'GET' }));
    expect(result).toEqual({ board, total: 0 });
  });

  test('createTicket은 POST /api/tickets로 본문을 전송한다', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: 1, title: '새 티켓' }, 201));

    await createTicket({ title: '새 티켓', priority: 'HIGH' });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/tickets',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '새 티켓', priority: 'HIGH' }),
      })
    );
  });

  test('updateTicket은 PATCH /api/tickets/:id로 전송한다', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: 7, title: '수정됨' }));

    await updateTicket(7, { title: '수정됨' });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/tickets/7',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ title: '수정됨' }) })
    );
  });

  test('completeTicket은 PATCH /api/tickets/:id/complete를 호출한다', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: 7, status: 'DONE' }));

    await completeTicket(7);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/tickets/7/complete',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  test('reorderTicket은 PATCH /api/tickets/reorder로 전송한다', async () => {
    mockFetch.mockResolvedValue(okResponse({ ticket: { id: 3 }, affected: [] }));

    await reorderTicket({ ticketId: 3, status: 'TODO', position: 0 });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/tickets/reorder',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ ticketId: 3, status: 'TODO', position: 0 }),
      })
    );
  });

  test('deleteTicket은 DELETE를 호출하고 204 본문 없음을 처리한다', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204, json: async () => null } as Response);

    await expect(deleteTicket(7)).resolves.toBeUndefined();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/tickets/7',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  test('에러 응답이면 API가 내려준 message로 예외를 던진다', async () => {
    mockFetch.mockResolvedValue(errorResponse('TICKET_NOT_FOUND', '티켓을 찾을 수 없습니다', 404));

    await expect(deleteTicket(999)).rejects.toThrow('티켓을 찾을 수 없습니다');
  });

  test('검증 에러도 message를 그대로 전달한다', async () => {
    mockFetch.mockResolvedValue(errorResponse('VALIDATION_ERROR', '제목을 입력해주세요', 400));

    await expect(createTicket({ title: '' })).rejects.toThrow('제목을 입력해주세요');
  });

  test('에러 본문을 해석할 수 없으면 일반 메시지로 예외를 던진다', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
    } as unknown as Response);

    await expect(getBoard()).rejects.toThrow('요청을 처리하지 못했습니다');
  });
});
