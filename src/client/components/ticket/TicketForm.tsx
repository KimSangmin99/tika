'use client';

import { useState, type FormEvent } from 'react';
import { TICKET_PRIORITY, type Ticket, type TicketPriority } from '@/shared/types';
import {
  createTicketSchema,
  updateTicketSchema,
  type CreateTicketInput,
  type UpdateTicketInput,
} from '@/shared/validations/ticket';

type TicketFormProps = {
  mode: 'create' | 'edit';
  initialData?: Partial<Ticket>;
  onSubmit: (data: CreateTicketInput | UpdateTicketInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
};

type FieldName = 'title' | 'description' | 'priority' | 'plannedStartDate' | 'dueDate';

const PRIORITY_OPTIONS: TicketPriority[] = [
  TICKET_PRIORITY.LOW,
  TICKET_PRIORITY.MEDIUM,
  TICKET_PRIORITY.HIGH,
];

export const TicketForm = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: TicketFormProps) => {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [priority, setPriority] = useState<TicketPriority>(
    initialData?.priority ?? TICKET_PRIORITY.MEDIUM
  );
  const [plannedStartDate, setPlannedStartDate] = useState(initialData?.plannedStartDate ?? '');
  const [dueDate, setDueDate] = useState(initialData?.dueDate ?? '');
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    // 빈 선택 필드는 전송하지 않는다 (priority는 select라 항상 값이 있다)
    const payload: Record<string, unknown> = { title, priority };
    if (description !== '') payload.description = description;
    if (plannedStartDate !== '') payload.plannedStartDate = plannedStartDate;
    if (dueDate !== '') payload.dueDate = dueDate;

    // 백엔드와 동일한 스키마로 검증한다 (docs/TRD.md §1.2 — 프론트 1차 검증)
    const schema = mode === 'create' ? createTicketSchema : updateTicketSchema;
    const parsed = schema.safeParse(payload);

    if (!parsed.success) {
      const nextErrors: Partial<Record<FieldName, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as FieldName | undefined;
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    onSubmit(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="ticket-title" className="text-sm font-medium text-gray-700">
          제목
        </label>
        <input
          id="ticket-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        {errors.title && <p className="text-xs text-red-600">{errors.title}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="ticket-description" className="text-sm font-medium text-gray-700">
          설명
        </label>
        <textarea
          id="ticket-description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        {errors.description && <p className="text-xs text-red-600">{errors.description}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="ticket-priority" className="text-sm font-medium text-gray-700">
          우선순위
        </label>
        <select
          id="ticket-priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as TicketPriority)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.priority && <p className="text-xs text-red-600">{errors.priority}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="ticket-planned-start" className="text-sm font-medium text-gray-700">
          시작예정일
        </label>
        <input
          id="ticket-planned-start"
          type="date"
          value={plannedStartDate}
          onChange={(e) => setPlannedStartDate(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        {errors.plannedStartDate && (
          <p className="text-xs text-red-600">{errors.plannedStartDate}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="ticket-due-date" className="text-sm font-medium text-gray-700">
          종료예정일
        </label>
        <input
          id="ticket-due-date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        {errors.dueDate && <p className="text-xs text-red-600">{errors.dueDate}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading && (
            <span
              data-testid="form-spinner"
              aria-hidden="true"
              className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"
            />
          )}
          저장
        </button>
      </div>
    </form>
  );
};
