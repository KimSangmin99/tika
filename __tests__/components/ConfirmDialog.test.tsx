/**
 * TC-COMP-006: ConfirmDialog
 * 근거: docs/COMPONENT_SPEC.md §3 공통 UI 컴포넌트, docs/TEST_CASES.md TC-COMP-006
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '@/client/components/ui/ConfirmDialog';

describe('ConfirmDialog', () => {
  // C006-1
  test('확인 버튼을 클릭하면 onConfirm이 호출된다', async () => {
    const onConfirm = jest.fn();
    render(
      <ConfirmDialog isOpen message="정말 삭제하시겠습니까?" onConfirm={onConfirm} onCancel={jest.fn()} />
    );

    await userEvent.click(screen.getByRole('button', { name: '확인' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  // C006-2
  test('취소 버튼을 클릭하면 onCancel이 호출된다', async () => {
    const onCancel = jest.fn();
    render(
      <ConfirmDialog isOpen message="정말 삭제하시겠습니까?" onConfirm={jest.fn()} onCancel={onCancel} />
    );

    await userEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('isOpen이 false면 아무것도 렌더링하지 않는다', () => {
    render(
      <ConfirmDialog isOpen={false} message="정말 삭제하시겠습니까?" onConfirm={jest.fn()} onCancel={jest.fn()} />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('정말 삭제하시겠습니까?')).not.toBeInTheDocument();
  });

  test('전달된 메시지를 표시한다', () => {
    render(
      <ConfirmDialog isOpen message="이 티켓을 삭제할까요?" onConfirm={jest.fn()} onCancel={jest.fn()} />
    );

    expect(screen.getByText('이 티켓을 삭제할까요?')).toBeInTheDocument();
  });

  // COMPONENT_SPEC.md §3 — 위험 동작은 빨간색 확인 버튼
  test('확인 버튼은 위험 동작을 나타내는 빨간색 계열이다', () => {
    render(
      <ConfirmDialog isOpen message="정말 삭제하시겠습니까?" onConfirm={jest.fn()} onCancel={jest.fn()} />
    );

    expect(screen.getByRole('button', { name: '확인' }).className).toContain('red');
  });

  test('ESC 키를 누르면 onCancel이 호출된다', async () => {
    const onCancel = jest.fn();
    render(
      <ConfirmDialog isOpen message="정말 삭제하시겠습니까?" onConfirm={jest.fn()} onCancel={onCancel} />
    );

    await userEvent.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('접근성 속성을 갖는다 (role=dialog, aria-modal)', () => {
    render(
      <ConfirmDialog isOpen message="정말 삭제하시겠습니까?" onConfirm={jest.fn()} onCancel={jest.fn()} />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
