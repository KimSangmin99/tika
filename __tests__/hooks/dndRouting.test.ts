/**
 * 드롭 판정 로직 — TC-INT-001 (드래그앤드롭 + API 연동)
 * 근거: docs/COMPONENT_SPEC.md §5.1, docs/API_SPEC.md §7 DnD 라우팅 규칙
 *
 * @dnd-kit의 실제 제스처는 jsdom에서 재현할 수 없으므로, 드롭 결과를
 * "어떤 API를 어떤 인자로 부를지"로 환원한 순수 함수를 검증한다.
 */
import { resolveDragEnd } from '@/client/hooks/boardDnd';
import type { BoardData, TicketWithMeta } from '@/shared/types';

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

describe('resolveDragEnd', () => {
  // I001-1: 칼럼 간 이동 (→TODO)
  test('BACKLOG 티켓을 TODO 칼럼에 드롭하면 reorder로 라우팅한다', () => {
    const board = makeBoard({ BACKLOG: [makeTicket({ id: 1 })] });

    const result = resolveDragEnd({ activeId: 1, overId: 'TODO' }, board);

    expect(result).toEqual({ action: 'reorder', ticketId: 1, status: 'TODO', position: 0 });
  });

  // I001-2: Done으로의 이동은 complete (reorder 아님)
  test('Done 칼럼에 드롭하면 complete로 라우팅한다', () => {
    const board = makeBoard({ IN_PROGRESS: [makeTicket({ id: 1, status: 'IN_PROGRESS' })] });

    const result = resolveDragEnd({ activeId: 1, overId: 'DONE' }, board);

    expect(result).toEqual({ action: 'complete', ticketId: 1 });
  });

  test('Done 칼럼의 다른 카드 위에 드롭해도 complete로 라우팅한다', () => {
    const board = makeBoard({
      IN_PROGRESS: [makeTicket({ id: 1, status: 'IN_PROGRESS' })],
      DONE: [makeTicket({ id: 9, status: 'DONE' })],
    });

    const result = resolveDragEnd({ activeId: 1, overId: 9 }, board);

    expect(result).toEqual({ action: 'complete', ticketId: 1 });
  });

  // I001-3: 칼럼 내 순서 변경
  test('같은 칼럼에서 다른 카드 위에 드롭하면 그 위치 인덱스로 reorder한다', () => {
    const board = makeBoard({
      TODO: [
        makeTicket({ id: 1, status: 'TODO', position: 0 }),
        makeTicket({ id: 2, status: 'TODO', position: 1024 }),
        makeTicket({ id: 3, status: 'TODO', position: 2048 }),
      ],
    });

    // 1번을 3번 자리로 이동 → 1번을 뺀 목록 [2,3]에서 3의 인덱스는 1
    const result = resolveDragEnd({ activeId: 1, overId: 3 }, board);

    expect(result).toEqual({ action: 'reorder', ticketId: 1, status: 'TODO', position: 1 });
  });

  test('다른 칼럼의 카드 위에 드롭하면 그 카드의 칼럼과 인덱스를 쓴다', () => {
    const board = makeBoard({
      BACKLOG: [makeTicket({ id: 1 })],
      TODO: [makeTicket({ id: 5, status: 'TODO' }), makeTicket({ id: 6, status: 'TODO' })],
    });

    const result = resolveDragEnd({ activeId: 1, overId: 6 }, board);

    expect(result).toEqual({ action: 'reorder', ticketId: 1, status: 'TODO', position: 1 });
  });

  test('빈 칼럼에 드롭하면 position 0으로 reorder한다', () => {
    const board = makeBoard({ BACKLOG: [makeTicket({ id: 1 })] });

    const result = resolveDragEnd({ activeId: 1, overId: 'IN_PROGRESS' }, board);

    expect(result).toEqual({
      action: 'reorder',
      ticketId: 1,
      status: 'IN_PROGRESS',
      position: 0,
    });
  });

  test('칼럼 영역에 드롭하면 맨 뒤에 배치한다', () => {
    const board = makeBoard({
      BACKLOG: [makeTicket({ id: 1 })],
      TODO: [makeTicket({ id: 5, status: 'TODO' }), makeTicket({ id: 6, status: 'TODO' })],
    });

    const result = resolveDragEnd({ activeId: 1, overId: 'TODO' }, board);

    expect(result).toEqual({ action: 'reorder', ticketId: 1, status: 'TODO', position: 2 });
  });

  // 변화 없는 드롭은 API를 부르지 않는다
  test('드롭 대상이 없으면 아무 동작도 하지 않는다', () => {
    const board = makeBoard({ BACKLOG: [makeTicket({ id: 1 })] });

    expect(resolveDragEnd({ activeId: 1, overId: null }, board)).toEqual({ action: 'none' });
  });

  test('자기 자신 위에 드롭하면 아무 동작도 하지 않는다', () => {
    const board = makeBoard({ TODO: [makeTicket({ id: 1, status: 'TODO' })] });

    expect(resolveDragEnd({ activeId: 1, overId: 1 }, board)).toEqual({ action: 'none' });
  });

  test('같은 칼럼의 같은 자리에 드롭하면 아무 동작도 하지 않는다', () => {
    const board = makeBoard({
      TODO: [makeTicket({ id: 1, status: 'TODO' }), makeTicket({ id: 2, status: 'TODO' })],
    });

    // 1번이 이미 인덱스 0인데 같은 칼럼 맨 앞(2번 자리)으로 드롭 → 변화 없음
    expect(resolveDragEnd({ activeId: 1, overId: 'TODO' }, board)).not.toEqual({ action: 'none' });
    // 2번을 자기 자리에 드롭
    expect(resolveDragEnd({ activeId: 2, overId: 2 }, board)).toEqual({ action: 'none' });
  });

  test('보드에 없는 티켓 id면 아무 동작도 하지 않는다', () => {
    const board = makeBoard({ BACKLOG: [makeTicket({ id: 1 })] });

    expect(resolveDragEnd({ activeId: 999, overId: 'TODO' }, board)).toEqual({ action: 'none' });
  });

  test('이미 DONE인 티켓을 Done에 다시 드롭하면 아무 동작도 하지 않는다', () => {
    const board = makeBoard({ DONE: [makeTicket({ id: 1, status: 'DONE' })] });

    expect(resolveDragEnd({ activeId: 1, overId: 'DONE' }, board)).toEqual({ action: 'none' });
  });
});
