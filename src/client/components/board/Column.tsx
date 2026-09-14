import { COLUMN_LABELS, type TicketStatus, type TicketWithMeta } from '@/shared/types';
import { TicketCard } from './TicketCard';

type ColumnProps = {
  status: TicketStatus;
  tickets: TicketWithMeta[];
  onTicketClick?: (ticket: TicketWithMeta) => void;
};

export const Column = ({ status, tickets, onTicketClick }: ColumnProps) => (
  <section
    data-testid="column"
    data-status={status}
    aria-label={COLUMN_LABELS[status]}
    className="flex min-h-full w-full flex-col gap-2 rounded-lg bg-gray-50 p-3"
  >
    <header className="flex items-center gap-2">
      <h2 data-testid="column-title" className="text-sm font-semibold text-gray-800">
        {COLUMN_LABELS[status]}
      </h2>
      <span
        data-testid="column-count"
        className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700"
      >
        {tickets.length}
      </span>
    </header>

    {tickets.length === 0 ? (
      <p className="py-6 text-center text-xs text-gray-400">이 칼럼에 티켓이 없습니다</p>
    ) : (
      <ul className="flex flex-col gap-2">
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            <TicketCard ticket={ticket} onClick={() => onTicketClick?.(ticket)} />
          </li>
        ))}
      </ul>
    )}
  </section>
);
