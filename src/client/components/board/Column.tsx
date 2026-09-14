import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { COLUMN_LABELS, type TicketStatus, type TicketWithMeta } from '@/shared/types';
import { TicketCard } from './TicketCard';

type ColumnProps = {
  status: TicketStatus;
  tickets: TicketWithMeta[];
  onTicketClick?: (ticket: TicketWithMeta) => void;
  /** DndContext 밖(단위 테스트 등)에서는 드롭/정렬을 끈다 */
  sortable?: boolean;
};

const ColumnBody = ({ status, tickets, onTicketClick, sortable }: Required<Pick<ColumnProps, 'status' | 'tickets' | 'sortable'>> & Pick<ColumnProps, 'onTicketClick'>) => (
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
            <TicketCard
              ticket={ticket}
              sortable={sortable}
              onClick={() => onTicketClick?.(ticket)}
            />
          </li>
        ))}
      </ul>
    )}
  </section>
);

export const Column = ({ status, tickets, onTicketClick, sortable = false }: ColumnProps) => {
  // 칼럼 자체를 드롭 대상으로 등록한다 (빈 칼럼에도 떨어뜨릴 수 있어야 한다)
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: !sortable });

  const body = (
    <ColumnBody
      status={status}
      tickets={tickets}
      onTicketClick={onTicketClick}
      sortable={sortable}
    />
  );

  if (!sortable) return body;

  return (
    <div
      ref={setNodeRef}
      data-over={String(isOver)}
      className={isOver ? 'rounded-lg ring-2 ring-blue-400' : undefined}
    >
      <SortableContext items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {body}
      </SortableContext>
    </div>
  );
};
