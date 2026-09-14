import {
  COLUMN_ORDER,
  TICKET_STATUS,
  type BoardData,
  type ReorderableStatus,
  type TicketStatus,
  type TicketWithMeta,
} from '@/shared/types';

/** 드롭 대상 id — 칼럼 영역이면 status 문자열, 카드 위면 티켓 id */
export type DropTargetId = TicketStatus | number | null;

export type DragEndInput = {
  activeId: number;
  overId: DropTargetId;
};

export type DragResolution =
  | { action: 'complete'; ticketId: number }
  | { action: 'reorder'; ticketId: number; status: ReorderableStatus; position: number }
  | { action: 'none' };

const NONE: DragResolution = { action: 'none' };

function isTicketStatus(value: DropTargetId): value is TicketStatus {
  return typeof value === 'string' && (COLUMN_ORDER as string[]).includes(value);
}

function findTicket(board: BoardData, id: number): TicketWithMeta | undefined {
  return COLUMN_ORDER.flatMap((status) => board[status]).find((ticket) => ticket.id === id);
}

/**
 * 드롭 결과를 "어떤 API를 어떤 인자로 호출할지"로 환원한다.
 * docs/API_SPEC.md §7 라우팅 규칙: Done으로 가는 이동만 complete, 나머지는 reorder.
 * position은 대상 칼럼 내 삽입 인덱스이며 실제 값은 서버가 재계산한다.
 */
export function resolveDragEnd({ activeId, overId }: DragEndInput, board: BoardData): DragResolution {
  if (overId === null || overId === activeId) return NONE;

  const active = findTicket(board, activeId);
  if (!active) return NONE;

  // 드롭 대상이 칼럼이면 그 칼럼, 카드면 그 카드가 속한 칼럼
  let targetStatus: TicketStatus;
  if (isTicketStatus(overId)) {
    targetStatus = overId;
  } else {
    const over = findTicket(board, overId);
    if (!over) return NONE;
    targetStatus = over.status;
  }

  if (targetStatus === TICKET_STATUS.DONE) {
    // 이미 완료된 티켓을 다시 Done에 놓는 것은 변화가 없다
    return active.status === TICKET_STATUS.DONE ? NONE : { action: 'complete', ticketId: activeId };
  }

  // 이동 대상을 제외한 목록 기준으로 삽입 인덱스를 구한다
  const others = board[targetStatus].filter((ticket) => ticket.id !== activeId);
  const position = isTicketStatus(overId)
    ? others.length // 칼럼 빈 영역에 드롭 → 맨 뒤
    : others.findIndex((ticket) => ticket.id === overId);

  if (position < 0) return NONE;

  // 같은 칼럼에서 같은 자리면 변화가 없다
  const currentIndex = board[targetStatus].findIndex((ticket) => ticket.id === activeId);
  if (active.status === targetStatus && currentIndex === position) return NONE;

  return { action: 'reorder', ticketId: activeId, status: targetStatus as ReorderableStatus, position };
}
