import { parseTicketId, ticketNotFound, validationError } from '@/server/middleware/errorHandler';
import { findById, remove, update } from '@/server/services/ticketService';
import { updateTicketSchema } from '@/shared/validations/ticket';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = parseTicketId(rawId);

  if (id === null) {
    return validationError('티켓 ID는 양의 정수여야 합니다');
  }

  const ticket = await findById(id);

  if (!ticket) {
    return ticketNotFound();
  }

  return Response.json(ticket, { status: 200 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = parseTicketId(rawId);

  if (id === null) {
    return validationError('티켓 ID는 양의 정수여야 합니다');
  }

  const parsed = updateTicketSchema.safeParse(await request.json());

  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? '요청 데이터가 올바르지 않습니다');
  }

  const ticket = await update(id, parsed.data);

  if (!ticket) {
    return ticketNotFound();
  }

  return Response.json(ticket, { status: 200 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = parseTicketId(rawId);

  if (id === null) {
    return validationError('티켓 ID는 양의 정수여야 합니다');
  }

  const deleted = await remove(id);

  if (!deleted) {
    return ticketNotFound();
  }

  return new Response(null, { status: 204 });
}
