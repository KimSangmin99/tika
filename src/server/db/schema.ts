import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import type { TicketPriority, TicketStatus } from '@/shared/types';

// docs/DATA_MODEL.md §3 Drizzle 스키마 정의
export const tickets = pgTable(
  'tickets',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    // DB는 ENUM 대신 VARCHAR를 쓰지만(docs/DATA_MODEL.md §2), 애플리케이션에서는 좁은 union으로
    // 다루도록 $type으로 표기한다. 타입 전용 표기라 생성되는 SQL은 달라지지 않는다.
    status: varchar('status', { length: 20 }).$type<TicketStatus>().notNull().default('BACKLOG'),
    priority: varchar('priority', { length: 10 })
      .$type<TicketPriority>()
      .notNull()
      .default('MEDIUM'),
    position: integer('position').notNull().default(1),
    plannedStartDate: date('planned_start_date', { mode: 'string' }),
    dueDate: date('due_date', { mode: 'string' }),
    startedAt: timestamp('started_at', { mode: 'date' }),
    completedAt: timestamp('completed_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_tickets_status_position').on(table.status, table.position),
    index('idx_tickets_due_date').on(table.dueDate),
    index('idx_tickets_completed_at').on(table.completedAt),
  ]
);
