/**
 * TC-COMP-001: TicketCard
 * 근거: docs/COMPONENT_SPEC.md §2.6, docs/TEST_CASES.md TC-COMP-001
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketCard } from '@/client/components/board/TicketCard';
import type { TicketWithMeta } from '@/shared/types';

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

describe('TicketCard', () => {
  // C001-1
  test('제목, 우선순위 뱃지, 종료예정일을 표시한다', () => {
    render(<TicketCard ticket={makeTicket({ priority: 'HIGH', dueDate: '2026-12-31' })} />);

    expect(screen.getByText('테스트 티켓')).toBeInTheDocument();
    expect(screen.getByTestId('priority-badge')).toHaveTextContent('HIGH');
    expect(screen.getByText('2026-12-31')).toBeInTheDocument();
  });

  // C001-2
  test('isOverdue가 true면 오버듀 경고를 표시한다', () => {
    render(<TicketCard ticket={makeTicket({ isOverdue: true, dueDate: '2020-01-01' })} />);

    expect(screen.getByLabelText('기한 초과')).toBeInTheDocument();
  });

  test('isOverdue가 false면 오버듀 경고를 표시하지 않는다', () => {
    render(<TicketCard ticket={makeTicket({ isOverdue: false })} />);

    expect(screen.queryByLabelText('기한 초과')).not.toBeInTheDocument();
  });

  // C001-3
  test('status가 DONE이면 완료 스타일이 적용된다', () => {
    render(<TicketCard ticket={makeTicket({ status: 'DONE' })} />);

    expect(screen.getByTestId('ticket-card')).toHaveAttribute('data-done', 'true');
  });

  test('status가 DONE이 아니면 완료 스타일이 적용되지 않는다', () => {
    render(<TicketCard ticket={makeTicket({ status: 'TODO' })} />);

    expect(screen.getByTestId('ticket-card')).toHaveAttribute('data-done', 'false');
  });

  // C001-4
  test('dueDate가 없으면 종료예정일 영역을 표시하지 않는다', () => {
    render(<TicketCard ticket={makeTicket({ dueDate: null })} />);

    expect(screen.queryByTestId('due-date')).not.toBeInTheDocument();
  });

  // C001-5
  test('카드를 클릭하면 onClick 핸들러가 호출된다', async () => {
    const onClick = jest.fn();
    render(<TicketCard ticket={makeTicket()} onClick={onClick} />);

    await userEvent.click(screen.getByTestId('ticket-card'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // C001-6
  test('긴 제목은 말줄임 처리된다', () => {
    render(<TicketCard ticket={makeTicket({ title: 'a'.repeat(200) })} />);

    expect(screen.getByTestId('ticket-title').className).toContain('truncate');
  });

  // C001-7
  test.each([
    ['LOW', 'gray'],
    ['MEDIUM', 'blue'],
    ['HIGH', 'red'],
  ])('우선순위 %s 뱃지는 %s 계열 색상을 쓴다', (priority, colorToken) => {
    render(
      <TicketCard ticket={makeTicket({ priority: priority as TicketWithMeta['priority'] })} />
    );

    expect(screen.getByTestId('priority-badge').className).toContain(colorToken);
  });

  // COMPONENT_SPEC.md §2.6 접근성
  test('접근성 속성을 갖는다 (role=button, aria-label)', () => {
    render(<TicketCard ticket={makeTicket({ title: '접근성 확인' })} />);

    const card = screen.getByTestId('ticket-card');
    expect(card).toHaveAttribute('role', 'button');
    expect(card).toHaveAttribute('aria-label', '티켓: 접근성 확인');
    expect(card).toHaveAttribute('tabindex', '0');
  });

  test('Enter 키로 상세를 열 수 있다', async () => {
    const onClick = jest.fn();
    render(<TicketCard ticket={makeTicket()} onClick={onClick} />);

    screen.getByTestId('ticket-card').focus();
    await userEvent.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
