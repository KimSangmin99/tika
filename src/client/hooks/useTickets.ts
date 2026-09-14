'use client';

import { useCallback, useRef, useState } from 'react';
import * as ticketApi from '@/client/api/ticketApi';
import {
  COLUMN_ORDER,
  TICKET_STATUS,
  type BoardData,
  type ReorderableStatus,
  type TicketWithMeta,
} from '@/shared/types';
import type { CreateTicketInput, UpdateTicketInput } from '@/shared/validations/ticket';

export interface UseTicketsReturn {
  board: BoardData;
  isLoading: boolean;
  error: string | null;
  create: (data: CreateTicketInput) => Promise<void>;
  update: (id: number, data: UpdateTicketInput) => Promise<void>;
  remove: (id: number) => Promise<void>;
  reorder: (ticketId: number, status: ReorderableStatus, position: number) => Promise<void>;
  complete: (id: number) => Promise<void>;
}

function cloneBoard(board: BoardData): BoardData {
  return {
    BACKLOG: [...board.BACKLOG],
    TODO: [...board.TODO],
    IN_PROGRESS: [...board.IN_PROGRESS],
    DONE: [...board.DONE],
  };
}

/** 모든 칼럼에서 해당 id의 티켓을 제거한다 */
function removeFromBoard(board: BoardData, id: number): BoardData {
  const next = cloneBoard(board);
  for (const status of COLUMN_ORDER) {
    next[status] = next[status].filter((ticket) => ticket.id !== id);
  }
  return next;
}

/** 티켓을 자기 status 칼럼에 넣고 position 오름차순으로 정렬한다 */
function placeTicket(board: BoardData, ticket: TicketWithMeta): BoardData {
  const next = removeFromBoard(board, ticket.id);
  next[ticket.status] = [...next[ticket.status], ticket].sort((a, b) => a.position - b.position);
  return next;
}

export function useTickets(initialData: BoardData): UseTicketsReturn {
  const [board, setBoard] = useState<BoardData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // React는 setState 업데이터를 지연 실행하므로, 롤백용 백업을 업데이터 안에서
  // 캡처하면 catch 시점에 아직 비어 있다. 항상 최신 보드를 ref로 함께 추적한다.
  const boardRef = useRef<BoardData>(initialData);

  const applyBoard = useCallback((updater: (current: BoardData) => BoardData) => {
    setBoard((current) => {
      const next = updater(current);
      boardRef.current = next;
      return next;
    });
  }, []);

  /**
   * 낙관적 업데이트 공통 흐름 (docs/COMPONENT_SPEC.md §4):
   * 1) 현재 상태 백업 → 2) UI 즉시 반영 → 3) API 호출
   * 4) 성공: 서버 응답으로 확정 → 5) 실패: 백업으로 롤백 + 에러 표시
   */
  const run = useCallback(
    async (
      optimistic: ((current: BoardData) => BoardData) | null,
      request: () => Promise<(current: BoardData) => BoardData>
    ) => {
      // 백업은 낙관적 반영 전에 동기적으로 확보한다
      const backup = boardRef.current;

      setIsLoading(true);
      if (optimistic) applyBoard(optimistic);

      try {
        const confirm = await request();
        applyBoard(confirm);
        setError(null);
      } catch (cause) {
        applyBoard(() => backup);
        setError(cause instanceof Error ? cause.message : '요청을 처리하지 못했습니다');
      } finally {
        setIsLoading(false);
      }
    },
    [applyBoard]
  );

  const create = useCallback(
    async (data: CreateTicketInput) => {
      // 생성은 서버가 id·position을 정하므로 낙관적 반영 없이 응답으로 추가한다
      await run(null, async () => {
        const created = await ticketApi.createTicket(data);
        return (current) => placeTicket(current, created);
      });
    },
    [run]
  );

  const update = useCallback(
    async (id: number, data: UpdateTicketInput) => {
      await run(null, async () => {
        const updated = await ticketApi.updateTicket(id, data);
        return (current) => placeTicket(current, updated);
      });
    },
    [run]
  );

  const remove = useCallback(
    async (id: number) => {
      await run(
        (current) => removeFromBoard(current, id),
        async () => {
          await ticketApi.deleteTicket(id);
          return (current) => current;
        }
      );
    },
    [run]
  );

  const reorder = useCallback(
    async (ticketId: number, status: ReorderableStatus, position: number) => {
      await run(
        // 드래그 결과를 즉시 반영한다 (실제 position은 서버가 재계산)
        (current) => {
          const target = COLUMN_ORDER.flatMap((s) => current[s]).find((t) => t.id === ticketId);
          return target ? placeTicket(current, { ...target, status, position }) : current;
        },
        async () => {
          const { ticket, affected } = await ticketApi.reorderTicket({
            ticketId,
            status,
            position,
          });
          return (current) => {
            let next = placeTicket(current, ticket);
            // 재정렬로 position이 바뀐 다른 티켓들도 반영한다
            for (const { id, position: newPosition } of affected) {
              const found = COLUMN_ORDER.flatMap((s) => next[s]).find((t) => t.id === id);
              if (found) next = placeTicket(next, { ...found, position: newPosition });
            }
            return next;
          };
        }
      );
    },
    [run]
  );

  const complete = useCallback(
    async (id: number) => {
      // Done으로의 이동은 reorder가 아니라 complete API를 쓴다
      // (docs/API_SPEC.md §7 프론트엔드 DnD 라우팅 규칙)
      await run(
        (current) => {
          const target = COLUMN_ORDER.flatMap((s) => current[s]).find((t) => t.id === id);
          return target
            ? placeTicket(current, { ...target, status: TICKET_STATUS.DONE })
            : current;
        },
        async () => {
          const completed = await ticketApi.completeTicket(id);
          return (current) => placeTicket(current, completed);
        }
      );
    },
    [run]
  );

  return { board, isLoading, error, create, update, remove, reorder, complete };
}
