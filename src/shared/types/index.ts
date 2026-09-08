// 공유 타입의 단일 소스 (docs/DATA_MODEL.md §4).
// 프론트엔드/백엔드 양쪽에서 이 파일을 통해서만 도메인 타입을 참조한다.

export const TICKET_STATUS = {
  BACKLOG: 'BACKLOG',
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
} as const;

export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

export const TICKET_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export type TicketPriority = (typeof TICKET_PRIORITY)[keyof typeof TICKET_PRIORITY];

export interface Ticket {
  id: number;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  position: number;
  plannedStartDate: string | null; // YYYY-MM-DD, 시작예정일 (사용자 입력)
  dueDate: string | null; // YYYY-MM-DD, 종료예정일 (사용자 입력)
  startedAt: Date | null; // 시작일 (시스템 전용)
  completedAt: Date | null; // 종료일 (시스템 전용)
  createdAt: Date;
  updatedAt: Date;
}
