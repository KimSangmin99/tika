/**
 * TC-COMP-005: TicketModal
 * 근거: docs/COMPONENT_SPEC.md §2.7, docs/TEST_CASES.md TC-COMP-005
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketModal } from '@/client/components/ticket/TicketModal';
import type { TicketWithMeta } from '@/shared/types';

function makeTicket(overrides: Partial<TicketWithMeta> = {}): TicketWithMeta {
  return {
    id: 42,
    title: '상세 대상 티켓',
    description: '설명 내용',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    position: 0,
    plannedStartDate: '2026-12-01',
    dueDate: '2026-12-31',
    startedAt: new Date('2026-11-01T09:00:00Z'),
    completedAt: null,
    createdAt: new Date('2026-10-01T09:00:00Z'),
    updatedAt: new Date('2026-10-01T09:00:00Z'),
    isOverdue: false,
    ...overrides,
  };
}

function renderModal(props: Partial<Parameters<typeof TicketModal>[0]> = {}) {
  const defaults = {
    ticket: makeTicket(),
    isOpen: true,
    onClose: jest.fn(),
    onUpdate: jest.fn(),
    onDelete: jest.fn(),
  };
  const merged = { ...defaults, ...props };
  render(<TicketModal {...merged} />);
  return merged;
}

describe('TicketModal', () => {
  // C005-1
  test('isOpen이 true면 모달이 표시된다', () => {
    renderModal();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('isOpen이 false면 모달이 표시되지 않는다', () => {
    renderModal({ isOpen: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // C005-2
  test('상태·시작일·종료일·생성일을 읽기 전용으로 표시한다', () => {
    renderModal();

    expect(screen.getByTestId('readonly-status')).toHaveTextContent('IN_PROGRESS');
    expect(screen.getByTestId('readonly-startedAt')).toHaveTextContent('2026-11-01');
    expect(screen.getByTestId('readonly-createdAt')).toHaveTextContent('2026-10-01');
    // 읽기 전용 필드는 입력 요소가 아니다
    expect(screen.queryByLabelText('상태')).not.toBeInTheDocument();
  });

  test('시스템 필드 값이 없으면 "-"로 표시한다', () => {
    renderModal({ ticket: makeTicket({ startedAt: null, completedAt: null }) });

    expect(screen.getByTestId('readonly-startedAt')).toHaveTextContent('-');
    expect(screen.getByTestId('readonly-completedAt')).toHaveTextContent('-');
  });

  // C005-3
  test('제목·설명·우선순위·시작예정일·종료예정일은 편집 가능하다', () => {
    renderModal();

    expect(screen.getByLabelText('제목')).toHaveValue('상세 대상 티켓');
    expect(screen.getByLabelText('설명')).toHaveValue('설명 내용');
    expect(screen.getByLabelText('우선순위')).toHaveValue('HIGH');
    expect(screen.getByLabelText('시작예정일')).toHaveValue('2026-12-01');
    expect(screen.getByLabelText('종료예정일')).toHaveValue('2026-12-31');
  });

  test('수정 후 저장하면 티켓 id와 변경 데이터로 onUpdate가 호출된다', async () => {
    const { onUpdate } = renderModal();

    await userEvent.clear(screen.getByLabelText('제목'));
    await userEvent.type(screen.getByLabelText('제목'), '수정된 제목');
    await userEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith(42, expect.objectContaining({ title: '수정된 제목' }));
  });

  // COMPONENT_SPEC.md §4 — API는 null을 "값 삭제"로 해석한다
  test('수정 모드에서 선택 필드를 비우면 null로 전송해 삭제를 요청한다', async () => {
    const { onUpdate } = renderModal();

    await userEvent.clear(screen.getByLabelText('설명'));
    await userEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(onUpdate).toHaveBeenCalledWith(42, expect.objectContaining({ description: null }));
  });

  // C005-4
  test('ESC 키를 누르면 onClose가 호출된다', async () => {
    const { onClose } = renderModal();

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // C005-5
  test('오버레이를 클릭하면 onClose가 호출된다', async () => {
    const { onClose } = renderModal();

    await userEvent.click(screen.getByTestId('modal-overlay'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('모달 내부를 클릭해도 onClose가 호출되지 않는다', async () => {
    const { onClose } = renderModal();

    await userEvent.click(screen.getByRole('dialog'));

    expect(onClose).not.toHaveBeenCalled();
  });

  // C005-6
  test('삭제 버튼을 누르면 확인 다이얼로그가 뜨고, 확인 시 onDelete가 호출된다', async () => {
    const { onDelete } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(screen.getByText('정말 삭제하시겠습니까?')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: '확인' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(42);
  });

  test('확인 다이얼로그에서 취소하면 onDelete가 호출되지 않고 다이얼로그가 닫힌다', async () => {
    const { onDelete } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: '삭제' }));
    await userEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByText('정말 삭제하시겠습니까?')).not.toBeInTheDocument();
  });
});
