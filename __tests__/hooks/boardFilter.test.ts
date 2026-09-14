/**
 * 보드 필터 로직 — docs/COMPONENT_SPEC.md §2.3
 * (TEST_CASES.md에 전용 TC가 없어 명세의 필터 로직에서 직접 도출)
 */
import { applyFilter, countFilterMatches } from '@/client/hooks/boardFilter';
import type { BoardData, TicketWithMeta } from '@/shared/types';

function makeTicket(overrides: Partial<TicketWithMeta> = {}): TicketWithMeta {
  return {
    id: 1,
    title: '티켓',
    description: null,
    status: 'TODO',
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

/** 명세와 동일한 방식으로 이번 주 월요일/일요일을 구한다 */
function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function mondayOfThisWeek(): string {
  const d = new Date();
  const day = d.getDay(); // 0=일
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return toDateString(d);
}
function sundayOfThisWeek(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? 0 : 7 - day));
  return toDateString(d);
}
function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toDateString(d);
}

describe('applyFilter', () => {
  test("filter가 'all'이면 보드를 그대로 반환한다", () => {
    const board = makeBoard({
      BACKLOG: [makeTicket({ id: 1, status: 'BACKLOG' })],
      TODO: [makeTicket({ id: 2, dueDate: daysFromNow(300) })],
    });

    expect(applyFilter(board, 'all')).toEqual(board);
  });

  // §2.3 동작 5 — Backlog에는 필터가 적용되지 않는다
  test('어떤 필터에서도 Backlog는 항상 전체를 표시한다', () => {
    const board = makeBoard({
      BACKLOG: [
        makeTicket({ id: 1, status: 'BACKLOG', dueDate: null }),
        makeTicket({ id: 2, status: 'BACKLOG', dueDate: daysFromNow(300) }),
      ],
    });

    expect(applyFilter(board, 'thisWeek').BACKLOG).toHaveLength(2);
    expect(applyFilter(board, 'overdue').BACKLOG).toHaveLength(2);
  });

  describe("'thisWeek' 필터", () => {
    test('이번 주 월~일 범위의 dueDate를 가진 TODO/IN_PROGRESS만 남긴다', () => {
      const board = makeBoard({
        TODO: [
          makeTicket({ id: 1, status: 'TODO', dueDate: mondayOfThisWeek() }),
          makeTicket({ id: 2, status: 'TODO', dueDate: sundayOfThisWeek() }),
          makeTicket({ id: 3, status: 'TODO', dueDate: daysFromNow(300) }),
        ],
        IN_PROGRESS: [makeTicket({ id: 4, status: 'IN_PROGRESS', dueDate: mondayOfThisWeek() })],
      });

      const filtered = applyFilter(board, 'thisWeek');

      expect(filtered.TODO.map((t) => t.id)).toEqual([1, 2]);
      expect(filtered.IN_PROGRESS.map((t) => t.id)).toEqual([4]);
    });

    test('dueDate가 없으면 제외한다', () => {
      const board = makeBoard({ TODO: [makeTicket({ id: 1, dueDate: null })] });

      expect(applyFilter(board, 'thisWeek').TODO).toHaveLength(0);
    });

    test('DONE 칼럼은 이번주 필터에서 제외된다', () => {
      const board = makeBoard({
        DONE: [makeTicket({ id: 1, status: 'DONE', dueDate: mondayOfThisWeek() })],
      });

      expect(applyFilter(board, 'thisWeek').DONE).toHaveLength(0);
    });
  });

  describe("'overdue' 필터", () => {
    test('isOverdue가 true인 티켓만 남긴다', () => {
      const board = makeBoard({
        TODO: [
          makeTicket({ id: 1, isOverdue: true }),
          makeTicket({ id: 2, isOverdue: false }),
        ],
        IN_PROGRESS: [makeTicket({ id: 3, status: 'IN_PROGRESS', isOverdue: true })],
      });

      const filtered = applyFilter(board, 'overdue');

      expect(filtered.TODO.map((t) => t.id)).toEqual([1]);
      expect(filtered.IN_PROGRESS.map((t) => t.id)).toEqual([3]);
    });

    test('DONE은 오버듀가 될 수 없으므로 비워진다', () => {
      const board = makeBoard({
        DONE: [makeTicket({ id: 1, status: 'DONE', isOverdue: false })],
      });

      expect(applyFilter(board, 'overdue').DONE).toHaveLength(0);
    });
  });
});

describe('countFilterMatches', () => {
  test('각 필터에 해당하는 티켓 수를 센다 (Backlog 제외)', () => {
    const board = makeBoard({
      BACKLOG: [makeTicket({ id: 9, status: 'BACKLOG', isOverdue: true })],
      TODO: [
        makeTicket({ id: 1, dueDate: mondayOfThisWeek() }),
        makeTicket({ id: 2, isOverdue: true }),
      ],
      IN_PROGRESS: [
        makeTicket({ id: 3, status: 'IN_PROGRESS', dueDate: sundayOfThisWeek(), isOverdue: true }),
      ],
    });

    expect(countFilterMatches(board)).toEqual({ thisWeek: 2, overdue: 2 });
  });

  test('해당 티켓이 없으면 0을 반환한다', () => {
    expect(countFilterMatches(makeBoard())).toEqual({ thisWeek: 0, overdue: 0 });
  });
});
