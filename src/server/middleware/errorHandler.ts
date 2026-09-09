// docs/API_SPEC.md 공통 규칙 — 모든 에러는 { error: { code, message } } 형식으로 반환한다.

export const ERROR_CODE = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TICKET_NOT_FOUND: 'TICKET_NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

export function errorResponse(code: ErrorCode, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

export function validationError(message: string): Response {
  return errorResponse(ERROR_CODE.VALIDATION_ERROR, message, 400);
}

export function ticketNotFound(): Response {
  return errorResponse(ERROR_CODE.TICKET_NOT_FOUND, '티켓을 찾을 수 없습니다', 404);
}

/** 경로 파라미터 :id를 양의 정수로 파싱한다. 형식이 잘못되면 null. */
export function parseTicketId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
