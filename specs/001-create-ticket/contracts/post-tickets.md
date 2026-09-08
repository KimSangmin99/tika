# Contract: `POST /api/tickets`

전체 계약의 단일 소스는 `docs/API_SPEC.md` §1이다. 이 파일은 그 계약을 이 기능의 구현/테스트가
바로 참조할 수 있도록 요약한 것이며, 두 문서가 어긋나면 `docs/API_SPEC.md`가 우선한다.

## Request

`Content-Type: application/json`

| 필드 | 타입 | 필수 | 비고 |
|---|---|---|---|
| `title` | `string` | ✅ | 1~200자, 공백만 불가 |
| `description` | `string` | — | 최대 1000자 |
| `priority` | `'LOW' \| 'MEDIUM' \| 'HIGH'` | — | 기본값 `MEDIUM` |
| `plannedStartDate` | `string` (`YYYY-MM-DD`) | — | 형식 검증만 |
| `dueDate` | `string` (`YYYY-MM-DD`) | — | 오늘 포함 이후만 허용 |

## Response — 성공 `201 Created`

```json
{
  "id": 1,
  "title": "API 설계 문서 작성",
  "description": null,
  "status": "BACKLOG",
  "priority": "MEDIUM",
  "position": -1024,
  "plannedStartDate": null,
  "dueDate": null,
  "startedAt": null,
  "completedAt": null,
  "createdAt": "2026-09-08T00:00:00.000Z",
  "updatedAt": "2026-09-08T00:00:00.000Z"
}
```

## Response — 실패 `400 Bad Request`

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "제목을 입력해주세요" } }
```

| 조건 | `message` |
|---|---|
| 제목 누락/공백만 | `제목을 입력해주세요` |
| 제목 200자 초과 | `제목은 200자 이내로 입력해주세요` |
| 설명 1000자 초과 | `설명은 1000자 이내로 입력해주세요` |
| 잘못된 우선순위 | `우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요` |
| 과거 종료예정일 | `종료예정일은 오늘 이후 날짜를 선택해주세요` |

## 이 계약을 검증하는 자동화 테스트

`__tests__/api/tickets.test.ts` — TC-API-001 기준 6개 케이스(전체 필드 생성, 최소 생성, 제목
누락, 제목 초과, 과거 마감일, 잘못된 우선순위). `npm test`로 실행.
