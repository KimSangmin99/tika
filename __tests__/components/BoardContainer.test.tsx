/**
 * BoardContainer — docs/COMPONENT_SPEC.md §2.1
 * 보드 상태 관리와 모달 흐름의 통합 지점.
 * (TEST_CASES.md에 전용 TC가 없어 명세에서 직접 도출한 테스트)
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardContainer } from '@/client/components/board/BoardContainer';
import * as ticketApi from '@/client/api/ticketApi';
import type { BoardData, TicketWithMeta } from '@/shared/types';

jest.mock('@/client/api/ticketApi');
const api = jest.mocked(ticketApi);

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BoardContainer', () => {
  test('initialData의 티켓이 해당 칼럼에 렌더링된다', () => {
    render(
      <BoardContainer
        initialData={makeBoard({ TODO: [makeTicket({ id: 1, title: '투두 건', status: 'TODO' })] })}
      />
    );

    expect(screen.getByText('투두 건')).toBeInTheDocument();
  });

  test('"새 업무" 버튼을 누르면 생성 폼이 열린다', async () => {
    render(<BoardContainer initialData={makeBoard()} />);

    expect(screen.queryByLabelText('제목')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '새 업무' }));

    expect(screen.getByLabelText('제목')).toBeInTheDocument();
  });

  test('생성 폼을 제출하면 createTicket을 호출하고 보드에 추가한 뒤 폼을 닫는다', async () => {
    api.createTicket.mockResolvedValue(
      makeTicket({ id: 99, title: '생성된 티켓', status: 'BACKLOG', position: -1024 })
    );

    render(<BoardContainer initialData={makeBoard()} />);

    await userEvent.click(screen.getByRole('button', { name: '새 업무' }));
    await userEvent.type(screen.getByLabelText('제목'), '생성된 티켓');
    await userEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(api.createTicket).toHaveBeenCalledWith({ title: '생성된 티켓', priority: 'MEDIUM' });
    });
    expect(await screen.findByText('생성된 티켓')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByLabelText('제목')).not.toBeInTheDocument();
    });
  });

  test('카드를 클릭하면 상세 모달이 열린다', async () => {
    render(
      <BoardContainer
        initialData={makeBoard({ BACKLOG: [makeTicket({ id: 1, title: '상세 볼 티켓' })] })}
      />
    );

    await userEvent.click(screen.getByTestId('ticket-card'));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('제목')).toHaveValue('상세 볼 티켓');
  });

  test('모달에서 수정하면 updateTicket을 호출하고 모달을 닫는다', async () => {
    api.updateTicket.mockResolvedValue(makeTicket({ id: 1, title: '수정됨' }));

    render(
      <BoardContainer initialData={makeBoard({ BACKLOG: [makeTicket({ id: 1, title: '원래' })] })} />
    );

    await userEvent.click(screen.getByTestId('ticket-card'));
    const dialog = await screen.findByRole('dialog');
    await userEvent.clear(within(dialog).getByLabelText('제목'));
    await userEvent.type(within(dialog).getByLabelText('제목'), '수정됨');
    await userEvent.click(within(dialog).getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(api.updateTicket).toHaveBeenCalledWith(1, expect.objectContaining({ title: '수정됨' }));
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  test('모달에서 삭제를 확인하면 deleteTicket을 호출하고 보드에서 제거한다', async () => {
    api.deleteTicket.mockResolvedValue(undefined);

    render(
      <BoardContainer
        initialData={makeBoard({ BACKLOG: [makeTicket({ id: 1, title: '삭제될 티켓' })] })}
      />
    );

    await userEvent.click(screen.getByTestId('ticket-card'));
    await userEvent.click(await screen.findByRole('button', { name: '삭제' }));
    await userEvent.click(screen.getByRole('button', { name: '확인' }));

    await waitFor(() => {
      expect(api.deleteTicket).toHaveBeenCalledWith(1);
    });
    await waitFor(() => {
      expect(screen.queryByText('삭제될 티켓')).not.toBeInTheDocument();
    });
  });

  test('API 에러가 나면 화면에 에러 메시지를 표시한다', async () => {
    api.createTicket.mockRejectedValue(new Error('제목을 입력해주세요'));

    render(<BoardContainer initialData={makeBoard()} />);

    await userEvent.click(screen.getByRole('button', { name: '새 업무' }));
    await userEvent.type(screen.getByLabelText('제목'), '아무 제목');
    await userEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('제목을 입력해주세요');
  });
});
