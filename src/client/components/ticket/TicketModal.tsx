'use client';

import { useEffect, useState } from 'react';
import type { TicketWithMeta } from '@/shared/types';
import type { CreateTicketInput, UpdateTicketInput } from '@/shared/validations/ticket';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { TicketForm } from './TicketForm';

type TicketModalProps = {
  ticket: TicketWithMeta;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: number, data: UpdateTicketInput) => void;
  onDelete: (id: number) => void;
};

/** 시스템 필드 표시용 — 값이 없으면 "-" (docs/COMPONENT_SPEC.md §2.7) */
function formatDate(value: Date | string | null): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toISOString().slice(0, 10);
}

const READONLY_LABEL = {
  status: '상태',
  startedAt: '시작일',
  completedAt: '종료일',
  createdAt: '생성일',
} as const;

export const TicketModal = ({ ticket, isOpen, onClose, onUpdate, onDelete }: TicketModalProps) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      // 확인 다이얼로그가 떠 있으면 그쪽이 ESC를 처리한다
      if (event.key === 'Escape' && !isConfirmOpen) onClose();
    };

    document.addEventListener('keydown', handleEscape);

    // body 스크롤 잠금 (docs/COMPONENT_SPEC.md §2.7 동작 5)
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isConfirmOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (data: CreateTicketInput | UpdateTicketInput) => {
    onUpdate(ticket.id, data as UpdateTicketInput);
  };

  const readonlyFields = [
    ['status', ticket.status] as const,
    ['startedAt', formatDate(ticket.startedAt)] as const,
    ['completedAt', formatDate(ticket.completedAt)] as const,
    ['createdAt', formatDate(ticket.createdAt)] as const,
  ];

  return (
    <div
      data-testid="modal-overlay"
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
    >
      {/*
        aria-hidden: 확인 다이얼로그가 떠 있는 동안 뒤쪽 콘텐츠를 접근성 트리에서 제외한다.
        그러지 않으면 "취소" 버튼이 둘 동시에 노출돼 스크린리더·키보드 사용자가 혼란스럽다.
      */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`티켓 상세: ${ticket.title}`}
        aria-hidden={isConfirmOpen}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-lg bg-white p-5 shadow-lg"
      >
        <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded bg-gray-50 p-3 text-xs">
          {readonlyFields.map(([field, value]) => (
            <div key={field} className="flex justify-between gap-2">
              <span className="text-gray-500">{READONLY_LABEL[field]}</span>
              <span data-testid={`readonly-${field}`} className="font-medium text-gray-800">
                {value}
              </span>
            </div>
          ))}
        </div>

        <TicketForm
          mode="edit"
          initialData={ticket}
          onSubmit={handleSubmit}
          onCancel={onClose}
          key={ticket.id}
        />

        <div className="mt-4 border-t border-gray-200 pt-3">
          <button
            type="button"
            onClick={() => setIsConfirmOpen(true)}
            className="text-sm font-medium text-red-600 hover:underline"
          >
            삭제
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        message="정말 삭제하시겠습니까?"
        onConfirm={() => {
          setIsConfirmOpen(false);
          onDelete(ticket.id);
        }}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
};
