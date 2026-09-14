/**
 * TC-COMP-003: Board
 * 근거: docs/COMPONENT_SPEC.md §1 레이아웃 구성, §2.4, docs/TEST_CASES.md TC-COMP-003
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Board } from '@/client/components/board/Board';
import type { BoardData, TicketWithMeta } from '@/shared/types';

function makeTicket(overrides: Partial<TicketWithMeta> = {}): TicketWithMeta {
  return {
    id: 1,
    title: '테스트 티켓',
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

describe('Board', () => {
  // C003-1
  test('4개 칼럼을 BACKLOG, TODO, IN_PROGRESS, DONE 순서로 렌더링한다', () => {
    render(<Board board={makeBoard()} />);

    const statuses = screen.getAllByTestId('column').map((el) => el.getAttribute('data-status'));
    expect(statuses).toEqual(['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE']);
  });

  test('각 칼럼에 해당 상태의 티켓만 전달된다', () => {
    const board = makeBoard({
      BACKLOG: [makeTicket({ id: 1, title: '백로그 건', status: 'BACKLOG' })],
      TODO: [makeTicket({ id: 2, title: '투두 건', status: 'TODO' })],
      IN_PROGRESS: [makeTicket({ id: 3, title: '진행 건', status: 'IN_PROGRESS' })],
      DONE: [makeTicket({ id: 4, title: '완료 건', status: 'DONE' })],
    });

    render(<Board board={board} />);

    const columns = screen.getAllByTestId('column');
    expect(within(columns[0]!).getByText('백로그 건')).toBeInTheDocument();
    expect(within(columns[1]!).getByText('투두 건')).toBeInTheDocument();
    expect(within(columns[2]!).getByText('진행 건')).toBeInTheDocument();
    expect(within(columns[3]!).getByText('완료 건')).toBeInTheDocument();
  });

  // C003-2
  test('Backlog는 좌측 사이드바 영역에 배치된다', () => {
    render(<Board board={makeBoard({ BACKLOG: [makeTicket({ title: '백로그 건' })] })} />);

    const sidebar = screen.getByTestId('backlog-sidebar');
    expect(within(sidebar).getByTestId('column')).toHaveAttribute('data-status', 'BACKLOG');
  });

  test('TODO/In Progress/Done은 메인 영역에 배치된다', () => {
    render(<Board board={makeBoard()} />);

    const main = screen.getByTestId('board-main');
    const statuses = within(main)
      .getAllByTestId('column')
      .map((el) => el.getAttribute('data-status'));

    expect(statuses).toEqual(['TODO', 'IN_PROGRESS', 'DONE']);
  });

  // C003-3
  test('메인 영역이 반응형 그리드 클래스를 갖는다 (모바일 1 → 태블릿 2 → 데스크톱 3칼럼)', () => {
    render(<Board board={makeBoard()} />);

    const mainClass = screen.getByTestId('board-main').className;
    expect(mainClass).toContain('grid-cols-1');
    expect(mainClass).toContain('md:grid-cols-2');
    expect(mainClass).toContain('lg:grid-cols-3');
  });

  test('전체 레이아웃이 데스크톱에서 사이드바 + 메인 가로 배치가 된다', () => {
    render(<Board board={makeBoard()} />);

    const rootClass = screen.getByTestId('board').className;
    expect(rootClass).toContain('flex-col');
    expect(rootClass).toContain('lg:flex-row');
  });

  test('카드를 클릭하면 해당 티켓으로 onTicketClick이 호출된다', async () => {
    const onTicketClick = jest.fn();
    const target = makeTicket({ id: 7, title: '클릭 대상', status: 'TODO' });

    render(<Board board={makeBoard({ TODO: [target] })} onTicketClick={onTicketClick} />);
    await userEvent.click(screen.getByTestId('ticket-card'));

    expect(onTicketClick).toHaveBeenCalledWith(target);
  });
});
