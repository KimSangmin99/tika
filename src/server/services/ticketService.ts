import { asc, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { tickets } from '@/server/db/schema';
import type { CreateTicketInput } from '@/shared/validations/ticket';

// docs/DATA_MODEL.md §5.5 position 관리: 신규 티켓은 해당 칼럼의 min(position) - 1024 (맨 위 배치)
export async function create(input: CreateTicketInput) {
  const [topTicket] = await db
    .select({ position: tickets.position })
    .from(tickets)
    .where(eq(tickets.status, 'BACKLOG'))
    .orderBy(asc(tickets.position))
    .limit(1);

  const position = topTicket ? topTicket.position - 1024 : 0;

  const [ticket] = await db
    .insert(tickets)
    .values({
      title: input.title,
      description: input.description,
      priority: input.priority,
      position,
      plannedStartDate: input.plannedStartDate,
      dueDate: input.dueDate,
    })
    .returning();

  return ticket;
}
