import type { KeyboardEvent } from 'react';
import { TICKET_PRIORITY, TICKET_STATUS, type TicketPriority, type TicketWithMeta } from '@/shared/types';

type TicketCardProps = {
  ticket: TicketWithMeta;
  onClick?: () => void;
};

// docs/COMPONENT_SPEC.md §2.6 — LOW 회색, MEDIUM 파란색, HIGH 빨간색
const PRIORITY_BADGE_CLASS: Record<TicketPriority, string> = {
  [TICKET_PRIORITY.LOW]: 'bg-gray-100 text-gray-700',
  [TICKET_PRIORITY.MEDIUM]: 'bg-blue-100 text-blue-700',
  [TICKET_PRIORITY.HIGH]: 'bg-red-100 text-red-700',
};

export const TicketCard = ({ ticket, onClick }: TicketCardProps) => {
  const isDone = ticket.status === TICKET_STATUS.DONE;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      data-testid="ticket-card"
      data-done={String(isDone)}
      role="button"
      tabIndex={0}
      aria-label={`티켓: ${ticket.title}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={[
        'flex flex-col gap-2 rounded-lg border bg-white p-3 shadow-sm',
        'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500',
        ticket.isOverdue ? 'border-red-500' : 'border-gray-200',
        isDone ? 'opacity-60 line-through' : '',
      ].join(' ')}
    >
      <p data-testid="ticket-title" className="truncate text-sm font-medium text-gray-900">
        {ticket.title}
      </p>

      <div className="flex items-center gap-2">
        <span
          data-testid="priority-badge"
          className={`rounded px-2 py-0.5 text-xs font-semibold ${PRIORITY_BADGE_CLASS[ticket.priority]}`}
        >
          {ticket.priority}
        </span>

        {ticket.dueDate && (
          <span data-testid="due-date" className="text-xs text-gray-500">
            {ticket.dueDate}
          </span>
        )}

        {ticket.isOverdue && (
          <span role="img" aria-label="기한 초과" className="text-xs text-red-600">
            ⚠️
          </span>
        )}
      </div>
    </div>
  );
};
