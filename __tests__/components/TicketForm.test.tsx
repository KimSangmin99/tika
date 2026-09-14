/**
 * TC-COMP-004: TicketForm
 * 근거: docs/COMPONENT_SPEC.md §2.8, docs/TEST_CASES.md TC-COMP-004
 * 검증 스키마는 src/shared/validations/ticket.ts를 공유한다.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketForm } from '@/client/components/ticket/TicketForm';

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('TicketForm', () => {
  // C004-1
  test('생성 모드에서는 빈 폼이 렌더링되고 우선순위 기본값은 MEDIUM이다', () => {
    render(<TicketForm mode="create" onSubmit={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByLabelText('제목')).toHaveValue('');
    expect(screen.getByLabelText('설명')).toHaveValue('');
    expect(screen.getByLabelText('우선순위')).toHaveValue('MEDIUM');
    expect(screen.getByLabelText('시작예정일')).toHaveValue('');
    expect(screen.getByLabelText('종료예정일')).toHaveValue('');
  });

  // C004-2
  test('수정 모드에서는 initialData가 각 필드에 반영된다', () => {
    render(
      <TicketForm
        mode="edit"
        initialData={{
          title: '기존 제목',
          description: '기존 설명',
          priority: 'HIGH',
          plannedStartDate: '2026-12-01',
          dueDate: '2026-12-31',
        }}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByLabelText('제목')).toHaveValue('기존 제목');
    expect(screen.getByLabelText('설명')).toHaveValue('기존 설명');
    expect(screen.getByLabelText('우선순위')).toHaveValue('HIGH');
    expect(screen.getByLabelText('시작예정일')).toHaveValue('2026-12-01');
    expect(screen.getByLabelText('종료예정일')).toHaveValue('2026-12-31');
  });

  // C004-3
  test('빈 제목으로 제출하면 "제목을 입력해주세요" 에러를 표시하고 onSubmit을 호출하지 않는다', async () => {
    const onSubmit = jest.fn();
    render(<TicketForm mode="create" onSubmit={onSubmit} onCancel={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('제목을 입력해주세요')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('공백만 입력한 제목도 거부한다', async () => {
    const onSubmit = jest.fn();
    render(<TicketForm mode="create" onSubmit={onSubmit} onCancel={jest.fn()} />);

    await userEvent.type(screen.getByLabelText('제목'), '   ');
    await userEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('제목을 입력해주세요')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // C004-4
  test('과거 종료예정일을 입력하면 에러 메시지를 표시한다', async () => {
    const onSubmit = jest.fn();
    render(<TicketForm mode="create" onSubmit={onSubmit} onCancel={jest.fn()} />);

    await userEvent.type(screen.getByLabelText('제목'), '정상 제목');
    await userEvent.type(screen.getByLabelText('종료예정일'), '2020-01-01');
    await userEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(
      await screen.findByText('종료예정일은 오늘 이후 날짜를 선택해주세요')
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // C004-5
  test('시작예정일 date input이 렌더링된다', () => {
    render(<TicketForm mode="create" onSubmit={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByLabelText('시작예정일')).toHaveAttribute('type', 'date');
  });

  // C004-6
  test('모든 필드를 입력해 제출하면 입력값이 onSubmit으로 전달된다', async () => {
    const onSubmit = jest.fn();
    render(<TicketForm mode="create" onSubmit={onSubmit} onCancel={jest.fn()} />);

    await userEvent.type(screen.getByLabelText('제목'), 'API 설계 문서 작성');
    await userEvent.type(screen.getByLabelText('설명'), '엔드포인트 정의');
    await userEvent.selectOptions(screen.getByLabelText('우선순위'), 'HIGH');
    await userEvent.type(screen.getByLabelText('시작예정일'), dateOffset(1));
    await userEvent.type(screen.getByLabelText('종료예정일'), dateOffset(5));
    await userEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'API 설계 문서 작성',
      description: '엔드포인트 정의',
      priority: 'HIGH',
      plannedStartDate: dateOffset(1),
      dueDate: dateOffset(5),
    });
  });

  test('선택 필드를 비워두면 해당 필드 없이 제출된다', async () => {
    const onSubmit = jest.fn();
    render(<TicketForm mode="create" onSubmit={onSubmit} onCancel={jest.fn()} />);

    await userEvent.type(screen.getByLabelText('제목'), '제목만 입력');
    await userEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(onSubmit).toHaveBeenCalledWith({ title: '제목만 입력', priority: 'MEDIUM' });
  });

  // C004-7
  test('isLoading이면 저장 버튼이 비활성화되고 로딩 표시가 나타난다', () => {
    render(<TicketForm mode="create" isLoading onSubmit={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByRole('button', { name: /저장/ })).toBeDisabled();
    expect(screen.getByTestId('form-spinner')).toBeInTheDocument();
  });

  test('취소 버튼을 클릭하면 onCancel이 호출된다', async () => {
    const onCancel = jest.fn();
    render(<TicketForm mode="create" onSubmit={jest.fn()} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('설명이 1000자를 초과하면 에러 메시지를 표시한다', async () => {
    const onSubmit = jest.fn();
    render(<TicketForm mode="create" onSubmit={onSubmit} onCancel={jest.fn()} />);

    await userEvent.type(screen.getByLabelText('제목'), '정상 제목');
    // 1001자를 userEvent.type으로 입력하면 매우 느리고, userEvent.paste는 이 jsdom
    // 환경에서 clipboardData를 지원하지 않는다. 값만 직접 주입한다.
    fireEvent.change(screen.getByLabelText('설명'), { target: { value: 'a'.repeat(1001) } });
    await userEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('설명은 1000자 이내로 입력해주세요')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
