/**
 * FilterBar — docs/COMPONENT_SPEC.md §2.3
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from '@/client/components/board/FilterBar';

const counts = { thisWeek: 3, overdue: 2 };

describe('FilterBar', () => {
  test('필터 버튼과 각 해당 티켓 수를 표시한다', () => {
    render(<FilterBar activeFilter="all" onFilterChange={jest.fn()} counts={counts} />);

    expect(screen.getByRole('button', { name: /이번주 업무/ })).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: /일정 초과/ })).toHaveTextContent('2');
  });

  test('필터를 클릭하면 해당 필터로 onFilterChange가 호출된다', async () => {
    const onFilterChange = jest.fn();
    render(<FilterBar activeFilter="all" onFilterChange={onFilterChange} counts={counts} />);

    await userEvent.click(screen.getByRole('button', { name: /이번주 업무/ }));

    expect(onFilterChange).toHaveBeenCalledWith('thisWeek');
  });

  // §2.3 동작 3 — 활성 필터를 다시 누르면 해제
  test('이미 활성화된 필터를 다시 누르면 all로 해제한다', async () => {
    const onFilterChange = jest.fn();
    render(<FilterBar activeFilter="thisWeek" onFilterChange={onFilterChange} counts={counts} />);

    await userEvent.click(screen.getByRole('button', { name: /이번주 업무/ }));

    expect(onFilterChange).toHaveBeenCalledWith('all');
  });

  test('활성 필터는 aria-pressed로 표시된다', () => {
    render(<FilterBar activeFilter="overdue" onFilterChange={jest.fn()} counts={counts} />);

    expect(screen.getByRole('button', { name: /일정 초과/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /이번주 업무/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });
});
