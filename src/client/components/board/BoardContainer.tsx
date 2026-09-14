'use client';

import { useState } from 'react';
import { useTickets } from '@/client/hooks/useTickets';
import type { BoardData, TicketWithMeta } from '@/shared/types';
import type { CreateTicketInput, UpdateTicketInput } from '@/shared/validations/ticket';
import { TicketForm } from '../ticket/TicketForm';
import { TicketModal } from '../ticket/TicketModal';
import { Board } from './Board';
import { BoardHeader } from './BoardHeader';

type BoardContainerProps = {
  initialData: BoardData;
};

// docs/COMPONENT_SPEC.md §2.1 — 보드 상태 관리와 API 통신 총괄.
// DnD 컨텍스트는 TC-INT-001에서 추가한다.
export const BoardContainer = ({ initialData }: BoardContainerProps) => {
  const { board, error, isLoading, create, update, remove } = useTickets(initialData);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

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

      <Board board={board} onTicketClick={(ticket) => setSelectedTicketId(ticket.id)} />

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
