import {
  TICKET_STATUS,
  type BoardData,
  type TicketStatus,
  type TicketWithMeta,
} from '@/shared/types';

export type BoardFilter = 'all' | 'thisWeek' | 'overdue';

/** 필터가 적용되지 않는 칼럼 — Backlog는 항상 전체 표시 (docs/COMPONENT_SPEC.md §2.3 동작 5) */
const UNFILTERED_COLUMN: TicketStatus = TICKET_STATUS.BACKLOG;

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 이번 주 월요일 (일요일은 그 주의 마지막 날로 본다) */
function mondayOfThisWeek(): string {
  const date = new Date();
  const weekday = date.getDay(); // 0=일요일
  date.setDate(date.getDate() - (weekday === 0 ? 6 : weekday - 1));
  return toDateString(date);
}

function sundayOfThisWeek(): string {
  const date = new Date();
  const weekday = date.getDay();
  date.setDate(date.getDate() + (weekday === 0 ? 0 : 7 - weekday));
  return toDateString(date);
}

/** 이번 주 마감인 진행 중 업무 — BACKLOG/DONE은 대상이 아니다 */
export function isThisWeek(ticket: TicketWithMeta): boolean {
  if (!ticket.dueDate) return false;
  if (ticket.status === TICKET_STATUS.BACKLOG || ticket.status === TICKET_STATUS.DONE) {
    return false;
  }
  return ticket.dueDate >= mondayOfThisWeek() && ticket.dueDate <= sundayOfThisWeek();
}

export function isOverdue(ticket: TicketWithMeta): boolean {
  return ticket.isOverdue;
}

function predicateFor(filter: Exclude<BoardFilter, 'all'>): (t: TicketWithMeta) => boolean {
  return filter === 'thisWeek' ? isThisWeek : isOverdue;
}

/**
 * 클라이언트 사이드 필터링 (별도 API 호출 없음, docs/COMPONENT_SPEC.md §2.3 동작 4).
 * Backlog 칼럼은 어떤 필터에서도 전체를 유지한다.
 */
export function applyFilter(board: BoardData, filter: BoardFilter): BoardData {
  if (filter === 'all') return board;

  const matches = predicateFor(filter);

  return {
    BACKLOG: board[UNFILTERED_COLUMN],
    TODO: board.TODO.filter(matches),
    IN_PROGRESS: board.IN_PROGRESS.filter(matches),
    DONE: board.DONE.filter(matches),
  };
}

/** 필터 버튼에 표시할 해당 티켓 수 (Backlog는 필터 대상이 아니므로 제외) */
export function countFilterMatches(board: BoardData): { thisWeek: number; overdue: number } {
  const filterable = [...board.TODO, ...board.IN_PROGRESS, ...board.DONE];

  return {
    thisWeek: filterable.filter(isThisWeek).length,
    overdue: filterable.filter(isOverdue).length,
  };
}
