// 프론트엔드의 유일한 API 호출 창구 (CLAUDE.md 경계 규칙).
// 컴포넌트·훅은 fetch를 직접 호출하지 않고 이 모듈을 통해서만 백엔드와 통신한다.
import type { BoardData, TicketWithMeta } from '@/shared/types';
import type {
  CreateTicketInput,
  ReorderTicketInput,
  UpdateTicketInput,
} from '@/shared/validations/ticket';

const BASE_URL = '/api/tickets';

type ErrorBody = { error?: { code?: string; message?: string } };

/**
 * 응답을 해석한다. 실패 시 API가 내려준 message로 예외를 던져
 * 호출자(useTickets)가 그대로 사용자에게 보여줄 수 있게 한다.
 */
async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = '요청을 처리하지 못했습니다';
    try {
      const body = (await response.json()) as ErrorBody;
      if (body?.error?.message) message = body.error.message;
    } catch {
      // 본문이 JSON이 아니거나 비어 있으면 기본 메시지를 쓴다
    }
    throw new Error(message);
  }

  // 204 No Content는 본문이 없다
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

function jsonRequest(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

export async function getBoard(): Promise<{ board: BoardData; total: number }> {
  const response = await fetch(BASE_URL, jsonRequest('GET'));
  return parseResponse(response);
}

export async function getTicket(id: number): Promise<TicketWithMeta> {
  const response = await fetch(`${BASE_URL}/${id}`, jsonRequest('GET'));
  return parseResponse(response);
}

export async function createTicket(data: CreateTicketInput): Promise<TicketWithMeta> {
  const response = await fetch(BASE_URL, jsonRequest('POST', data));
  return parseResponse(response);
}

export async function updateTicket(
  id: number,
  data: UpdateTicketInput
): Promise<TicketWithMeta> {
  const response = await fetch(`${BASE_URL}/${id}`, jsonRequest('PATCH', data));
  return parseResponse(response);
}

/** Done으로의 이동은 reorder가 아니라 이 API를 쓴다 (docs/API_SPEC.md §7 라우팅 규칙) */
export async function completeTicket(id: number): Promise<TicketWithMeta> {
  const response = await fetch(`${BASE_URL}/${id}/complete`, jsonRequest('PATCH'));
  return parseResponse(response);
}

export async function reorderTicket(
  input: ReorderTicketInput
): Promise<{ ticket: TicketWithMeta; affected: { id: number; position: number }[] }> {
  const response = await fetch(`${BASE_URL}/reorder`, jsonRequest('PATCH', input));
  return parseResponse(response);
}

export async function deleteTicket(id: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/${id}`, jsonRequest('DELETE'));
  await parseResponse<void>(response);
}
