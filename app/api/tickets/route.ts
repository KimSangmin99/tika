import { createTicketSchema } from '@/shared/validations/ticket';
import { create, getBoard } from '@/server/services/ticketService';

export async function GET() {
  const board = await getBoard();

  return Response.json(board, { status: 200 });
}

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = createTicketSchema.safeParse(json);

  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? '요청 데이터가 올바르지 않습니다',
        },
      },
      { status: 400 }
    );
  }

  const ticket = await create(parsed.data);

  return Response.json(ticket, { status: 201 });
}
