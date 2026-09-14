/**
 * TC-COMP-002: Column
 * 근거: docs/COMPONENT_SPEC.md §2.5, docs/TEST_CASES.md TC-COMP-002
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Column } from '@/client/components/board/Column';
import type { TicketStatus, TicketWithMeta } from '@/shared/types';

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

describe('Column', () => {
  // C002-1
  test('티켓이 있으면 카드 목록과 개수 뱃지를 표시한다', () => {
    const tickets = [
      makeTicket({ id: 1, title: '첫번째' }),
      makeTicket({ id: 2, title: '두번째' }),
    ];

    render(<Column status="BACKLOG" tickets={tickets} />);

    expect(screen.getByText('첫번째')).toBeInTheDocument();
    expect(screen.getByText('두번째')).toBeInTheDocument();
    expect(screen.getAllByTestId('ticket-card')).toHaveLength(2);
    expect(screen.getByTestId('column-count')).toHaveTextContent('2');
  });

  // C002-2
  test('빈 칼럼이면 안내 문구를 표시한다', () => {
    render(<Column status="TODO" tickets={[]} />);

    expect(screen.getByText('이 칼럼에 티켓이 없습니다')).toBeInTheDocument();
    expect(screen.queryAllByTestId('ticket-card')).toHaveLength(0);
    expect(screen.getByTestId('column-count')).toHaveTextContent('0');
  });

  test('티켓이 있으면 빈 칼럼 안내를 표시하지 않는다', () => {
    render(<Column status="TODO" tickets={[makeTicket()]} />);

    expect(screen.queryByText('이 칼럼에 티켓이 없습니다')).not.toBeInTheDocument();
  });

  // C002-3
  test.each([
    ['BACKLOG', 'Backlog'],
    ['TODO', 'TODO'],
    ['IN_PROGRESS', 'In Progress'],
    ['DONE', 'Done'],
  ])('칼럼 헤더에 %s의 칼럼명 "%s"을 표시한다', (status, label) => {
    render(<Column status={status as TicketStatus} tickets={[]} />);

    expect(screen.getByTestId('column-title')).toHaveTextContent(label);
  });

  test('전달된 순서 그대로 카드를 렌더링한다', () => {
    const tickets = [
      makeTicket({ id: 1, title: 'A', position: -1024 }),
      makeTicket({ id: 2, title: 'B', position: 0 }),
      makeTicket({ id: 3, title: 'C', position: 1024 }),
    ];

    render(<Column status="BACKLOG" tickets={tickets} />);

    const titles = screen.getAllByTestId('ticket-title').map((el) => el.textContent);
    expect(titles).toEqual(['A', 'B', 'C']);
  });

  test('카드를 클릭하면 해당 티켓으로 onTicketClick이 호출된다', async () => {
    const onTicketClick = jest.fn();
    const target = makeTicket({ id: 42, title: '클릭 대상' });

    render(<Column status="BACKLOG" tickets={[target]} onTicketClick={onTicketClick} />);
    await userEvent.click(screen.getByTestId('ticket-card'));

    expect(onTicketClick).toHaveBeenCalledTimes(1);
    expect(onTicketClick).toHaveBeenCalledWith(target);
  });

  test('칼럼 상태를 식별할 수 있는 속성을 갖는다', () => {
    render(<Column status="IN_PROGRESS" tickets={[]} />);

    expect(screen.getByTestId('column')).toHaveAttribute('data-status', 'IN_PROGRESS');
  });
});
