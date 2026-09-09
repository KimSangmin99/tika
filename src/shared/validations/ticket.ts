import { z } from 'zod';

// docs/API_SPEC.md §1 POST /api/tickets 요청 검증 스키마
export const createTicketSchema = z.object({
  title: z
    .string({ required_error: '제목을 입력해주세요' })
    .min(1, '제목을 입력해주세요')
    .max(200, '제목은 200자 이내로 입력해주세요')
    .refine((val) => val.trim().length > 0, '제목을 입력해주세요'),
  description: z.string().max(1000, '설명은 1000자 이내로 입력해주세요').optional(),
  priority: z
    .enum(['LOW', 'MEDIUM', 'HIGH'], {
      errorMap: () => ({ message: '우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요' }),
    })
    .optional(),
  plannedStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (val) => val >= new Date().toISOString().slice(0, 10),
      '종료예정일은 오늘 이후 날짜를 선택해주세요'
    )
    .optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

// docs/API_SPEC.md §4 PATCH /api/tickets/:id — 전부 선택 필드, null은 "값 삭제"를 뜻한다.
// status/position/startedAt/completedAt은 스키마에 없으므로 이 API로 변경할 수 없다.
export const updateTicketSchema = z.object({
  title: z
    .string()
    .min(1, '제목을 입력해주세요')
    .max(200, '제목은 200자 이내로 입력해주세요')
    .refine((val) => val.trim().length > 0, '제목을 입력해주세요')
    .optional(),
  description: z.string().max(1000, '설명은 1000자 이내로 입력해주세요').nullable().optional(),
  priority: z
    .enum(['LOW', 'MEDIUM', 'HIGH'], {
      errorMap: () => ({ message: '우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요' }),
    })
    .optional(),
  plannedStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (val) => val >= new Date().toISOString().slice(0, 10),
      '종료예정일은 오늘 이후 날짜를 선택해주세요'
    )
    .nullable()
    .optional(),
});

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

// docs/API_SPEC.md §7 PATCH /api/tickets/reorder
// DONE은 허용하지 않는다 — Done 이동은 PATCH /api/tickets/:id/complete를 사용한다.
export const reorderTicketSchema = z.object({
  ticketId: z.number().int().positive(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS'], {
    errorMap: () => ({ message: '상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요' }),
  }),
  position: z.number().int(),
});

export type ReorderTicketInput = z.infer<typeof reorderTicketSchema>;
