/**
 * useTickets — 티켓 CRUD + 낙관적 업데이트
 * 근거: docs/COMPONENT_SPEC.md §4, docs/TEST_CASES.md TC-INT-001
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useTickets } from '@/client/hooks/useTickets';
import * as ticketApi from '@/client/api/ticketApi';
import type { BoardData, TicketWithMeta } from '@/shared/types';

jest.mock('@/client/api/ticketApi');
const api = jest.mocked(ticketApi);

function makeTicket(overrides: Partial<TicketWithMeta> = {}): TicketWithMeta {
  return {
    id: 1,
    title: '티켓',
    description: null,
    status: 'BACKLOG',
    priority: 'MEDIUM',
    position: 0,
    plannedStartDate: null,
    dueDate: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    isOverdue: false,
    ...overrides,
  };
}

function makeBoard(overrides: Partial<BoardData> = {}): BoardData {
  return { BACKLOG: [], TODO: [], IN_PROGRESS: [], DONE: [], ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useTickets', () => {
  test('initialData를 board 초기 상태로 사용한다', () => {
    const initial = makeBoard({ BACKLOG: [makeTicket({ title: '초기 티켓' })] });

    const { result } = renderHook(() => useTickets(initial));

    expect(result.current.board.BACKLOG).toHaveLength(1);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  test('create는 API를 호출하고 반환된 티켓을 Backlog 맨 위에 추가한다', async () => {
    const created = makeTicket({ id: 10, title: '새 티켓', position: -1024 });
    api.createTicket.mockResolvedValue(created);
    const existing = makeTicket({ id: 1, title: '기존', position: 0 });

    const { result } = renderHook(() => useTickets(makeBoard({ BACKLOG: [existing] })));

    await act(async () => {
      await result.current.create({ title: '새 티켓' });
    });

    expect(api.createTicket).toHaveBeenCalledWith({ title: '새 티켓' });
    expect(result.current.board.BACKLOG.map((t) => t.id)).toEqual([10, 1]);
  });

  test('update는 API 응답으로 해당 티켓을 교체한다', async () => {
    const updated = makeTicket({ id: 1, title: '수정된 제목' });
    api.updateTicket.mockResolvedValue(updated);

    const { result } = renderHook(() =>
      useTickets(makeBoard({ BACKLOG: [makeTicket({ id: 1, title: '원래' })] }))
    );

    await act(async () => {
      await result.current.update(1, { title: '수정된 제목' });
    });

    expect(api.updateTicket).toHaveBeenCalledWith(1, { title: '수정된 제목' });
    expect(result.current.board.BACKLOG[0]?.title).toBe('수정된 제목');
  });

  test('remove는 보드에서 티켓을 제거한다', async () => {
    api.deleteTicket.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useTickets(makeBoard({ BACKLOG: [makeTicket({ id: 1 }), makeTicket({ id: 2 })] }))
    );

    await act(async () => {
      await result.current.remove(1);
    });

    expect(api.deleteTicket).toHaveBeenCalledWith(1);
    expect(result.current.board.BACKLOG.map((t) => t.id)).toEqual([2]);
  });

  // TC-INT-001 I001-1
  test('reorder는 UI를 즉시 반영한 뒤 reorder API를 호출한다 (낙관적 업데이트)', async () => {
    const moved = makeTicket({ id: 1, status: 'TODO', startedAt: new Date() });
    api.reorderTicket.mockResolvedValue({ ticket: moved, affected: [] });

    const { result } = renderHook(() =>
      useTickets(makeBoard({ BACKLOG: [makeTicket({ id: 1, status: 'BACKLOG' })] }))
    );

    await act(async () => {
      await result.current.reorder(1, 'TODO', 0);
    });

    expect(api.reorderTicket).toHaveBeenCalledWith({ ticketId: 1, status: 'TODO', position: 0 });
    expect(result.current.board.BACKLOG).toHaveLength(0);
    expect(result.current.board.TODO.map((t) => t.id)).toEqual([1]);
    expect(result.current.board.TODO[0]?.startedAt).not.toBeNull();
  });

  // TC-INT-001 I001-2
  test('complete는 reorder가 아니라 complete API를 호출하고 Done으로 옮긴다', async () => {
    const done = makeTicket({ id: 1, status: 'DONE', completedAt: new Date() });
    api.completeTicket.mockResolvedValue(done);

    const { result } = renderHook(() =>
      useTickets(makeBoard({ IN_PROGRESS: [makeTicket({ id: 1, status: 'IN_PROGRESS' })] }))
    );

    await act(async () => {
      await result.current.complete(1);
    });

    expect(api.completeTicket).toHaveBeenCalledWith(1);
    expect(api.reorderTicket).not.toHaveBeenCalled();
    expect(result.current.board.IN_PROGRESS).toHaveLength(0);
    expect(result.current.board.DONE.map((t) => t.id)).toEqual([1]);
  });

  // TC-INT-001 I001-4
  test('reorder API가 실패하면 원래 상태로 롤백하고 에러를 표시한다', async () => {
    api.reorderTicket.mockRejectedValue(new Error('티켓을 찾을 수 없습니다'));
    const initial = makeBoard({ BACKLOG: [makeTicket({ id: 1, status: 'BACKLOG' })] });

    const { result } = renderHook(() => useTickets(initial));

    await act(async () => {
      await result.current.reorder(1, 'TODO', 0);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('티켓을 찾을 수 없습니다');
    });
    // 롤백: 원래 칼럼으로 복원
    expect(result.current.board.BACKLOG.map((t) => t.id)).toEqual([1]);
    expect(result.current.board.TODO).toHaveLength(0);
  });

  test('create가 실패하면 보드는 그대로 두고 에러를 표시한다', async () => {
    api.createTicket.mockRejectedValue(new Error('제목을 입력해주세요'));

    const { result } = renderHook(() => useTickets(makeBoard()));

    await act(async () => {
      await result.current.create({ title: '' });
    });

    expect(result.current.error).toBe('제목을 입력해주세요');
    expect(result.current.board.BACKLOG).toHaveLength(0);
  });

  test('성공한 다음 액션은 이전 에러를 지운다', async () => {
    api.createTicket.mockRejectedValueOnce(new Error('제목을 입력해주세요'));
    api.createTicket.mockResolvedValueOnce(makeTicket({ id: 5, title: '정상' }));

    const { result } = renderHook(() => useTickets(makeBoard()));

    await act(async () => {
      await result.current.create({ title: '' });
    });
    expect(result.current.error).toBe('제목을 입력해주세요');

    await act(async () => {
      await result.current.create({ title: '정상' });
    });
    expect(result.current.error).toBeNull();
  });

  test('reorder 응답의 affected 티켓 position이 보드에 반영된다', async () => {
    const moved = makeTicket({ id: 1, status: 'TODO', position: 2048 });
    api.reorderTicket.mockResolvedValue({
      ticket: moved,
      affected: [{ id: 2, position: 3072 }],
    });

    const { result } = renderHook(() =>
      useTickets(
        makeBoard({
          BACKLOG: [makeTicket({ id: 1, status: 'BACKLOG' })],
          TODO: [makeTicket({ id: 2, status: 'TODO', position: 1 })],
        })
      )
    );

    await act(async () => {
      await result.current.reorder(1, 'TODO', 1);
    });

    const affected = result.current.board.TODO.find((t) => t.id === 2);
    expect(affected?.position).toBe(3072);
  });
});
