import { parseTicketId, ticketNotFound, validationError } from '@/server/middleware/errorHandler';
import { complete } from '@/server/services/ticketService';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = parseTicketId(rawId);

  if (id === null) {
    return validationError('티켓 ID는 양의 정수여야 합니다');
  }

  const ticket = await complete(id);

  if (!ticket) {
    return ticketNotFound();
  }

  return Response.json(ticket, { status: 200 });
}
