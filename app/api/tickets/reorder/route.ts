import { ticketNotFound, validationError } from '@/server/middleware/errorHandler';
import { reorder } from '@/server/services/ticketService';
import { reorderTicketSchema } from '@/shared/validations/ticket';

export async function PATCH(request: Request) {
  const parsed = reorderTicketSchema.safeParse(await request.json());

  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? '요청 데이터가 올바르지 않습니다');
  }

  const result = await reorder(parsed.data);

  if (!result) {
    return ticketNotFound();
  }

  return Response.json(result, { status: 200 });
}
