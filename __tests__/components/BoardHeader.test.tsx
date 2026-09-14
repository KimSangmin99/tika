/**
 * BoardHeader — docs/COMPONENT_SPEC.md §2.2
 * (TEST_CASES.md에 전용 TC가 없어 명세에서 직접 도출한 테스트)
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardHeader } from '@/client/components/board/BoardHeader';

describe('BoardHeader', () => {
  test('"새 업무" 버튼을 클릭하면 onCreateClick이 호출된다', async () => {
    const onCreateClick = jest.fn();
    render(<BoardHeader onCreateClick={onCreateClick} />);

    await userEvent.click(screen.getByRole('button', { name: '새 업무' }));

    expect(onCreateClick).toHaveBeenCalledTimes(1);
  });

  // §2.2 — SearchInput은 2차 구현. MVP에서는 비활성 placeholder.
  test('검색 입력은 2차 구현이므로 비활성 상태로 렌더링된다', () => {
    render(<BoardHeader onCreateClick={jest.fn()} />);

    const search = screen.getByPlaceholderText('검색 (준비 중)');
    expect(search).toBeDisabled();
  });
});
