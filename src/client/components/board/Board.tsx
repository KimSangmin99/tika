import { TICKET_STATUS, type BoardData, type TicketStatus, type TicketWithMeta } from '@/shared/types';
import { Column } from './Column';

type BoardProps = {
  board: BoardData;
  onTicketClick?: (ticket: TicketWithMeta) => void;
};

// docs/COMPONENT_SPEC.md §1 — Backlog는 사이드바, 나머지 3개는 메인 영역 그리드
const MAIN_COLUMNS: TicketStatus[] = [
  TICKET_STATUS.TODO,
  TICKET_STATUS.IN_PROGRESS,
  TICKET_STATUS.DONE,
];

export const Board = ({ board, onTicketClick }: BoardProps) => (
  <div data-testid="board" className="flex flex-col gap-4 lg:flex-row">
    <aside data-testid="backlog-sidebar" className="w-full lg:w-72 lg:shrink-0">
      <Column
        status={TICKET_STATUS.BACKLOG}
        tickets={board[TICKET_STATUS.BACKLOG]}
        onTicketClick={onTicketClick}
      />
    </aside>

    <div
      data-testid="board-main"
      className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      {MAIN_COLUMNS.map((status) => (
        <Column
          key={status}
          status={status}
          tickets={board[status]}
          onTicketClick={onTicketClick}
        />
      ))}
    </div>
  </div>
);
