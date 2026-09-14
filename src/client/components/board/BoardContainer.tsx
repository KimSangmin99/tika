'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { resolveDragEnd, type DropTargetId } from '@/client/hooks/boardDnd';
import { useTickets } from '@/client/hooks/useTickets';
import type { BoardData, TicketWithMeta } from '@/shared/types';
import type { CreateTicketInput, UpdateTicketInput } from '@/shared/validations/ticket';
import { TicketForm } from '../ticket/TicketForm';
import { TicketModal } from '../ticket/TicketModal';
import { Board } from './Board';
import { TicketCard } from './TicketCard';
import { BoardHeader } from './BoardHeader';

type BoardContainerProps = {
  initialData: BoardData;
};

// docs/COMPONENT_SPEC.md §2.1 — 보드 상태 관리와 API 통신 총괄.
// DnD 컨텍스트는 TC-INT-001에서 추가한다.
export const BoardContainer = ({ initialData }: BoardContainerProps) => {
  const { board, error, isLoading, create, update, remove, reorder, complete } =
    useTickets(initialData);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);

  // 클릭과 드래그를 구분한다 — 8px 이상 움직여야 드래그로 본다
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // 보드가 갱신돼도 항상 최신 티켓을 모달에 보여주기 위해 id로 조회한다
  const selectedTicket =
    selectedTicketId === null
      ? null
      : ([board.BACKLOG, board.TODO, board.IN_PROGRESS, board.DONE]
          .flat()
          .find((ticket) => ticket.id === selectedTicketId) ?? null);

  const handleCreate = async (data: CreateTicketInput | UpdateTicketInput) => {
    await create(data as CreateTicketInput);
    setIsCreating(false);
  };

  const handleUpdate = async (id: number, data: UpdateTicketInput) => {
    await update(id, data);
    setSelectedTicketId(null);
  };

  const handleDelete = async (id: number) => {
    await remove(id);
    setSelectedTicketId(null);
  };

  const activeTicket =
    activeTicketId === null
      ? null
      : ([board.BACKLOG, board.TODO, board.IN_PROGRESS, board.DONE]
          .flat()
          .find((ticket) => ticket.id === activeTicketId) ?? null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTicketId(Number(event.active.id));
  };

  // docs/COMPONENT_SPEC.md §5.1 — 대상이 Done이면 complete, 그 외에는 reorder
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTicketId(null);

    const overId = (event.over?.id ?? null) as DropTargetId;
    const resolution = resolveDragEnd({ activeId: Number(event.active.id), overId }, board);

    if (resolution.action === 'complete') {
      await complete(resolution.ticketId);
    } else if (resolution.action === 'reorder') {
      await reorder(resolution.ticketId, resolution.status, resolution.position);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <BoardHeader onCreateClick={() => setIsCreating(true)} />

      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {isCreating && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">새 업무 만들기</h2>
          <TicketForm
            mode="create"
            isLoading={isLoading}
            onSubmit={handleCreate}
            onCancel={() => setIsCreating(false)}
          />
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Board
          board={board}
          sortable
          onTicketClick={(ticket) => setSelectedTicketId(ticket.id)}
          overlay={
            <DragOverlay>
              {activeTicket && <TicketCard ticket={activeTicket} />}
            </DragOverlay>
          }
        />
      </DndContext>

      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          isOpen
          onClose={() => setSelectedTicketId(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};
