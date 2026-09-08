# Quickstart: `POST /api/tickets` 검증

## Prerequisites

- `npm install` 완료
- `.env.local`에 `POSTGRES_URL`이 로컬 Postgres(`tika_dev`)를 가리키도록 설정됨
- 마이그레이션 적용됨: `npm run db:migrate`

## 1. 자동화 테스트로 계약 검증 (권장 — 실DB 없이 실행 가능)

```bash
npm test
```

**기대 결과**: `__tests__/api/tickets.test.ts`의 6개 테스트(TC-API-001) 전부 통과.

## 2. 개발 서버로 실제 동작 확인

```bash
npm run dev
```

### 성공 케이스

```bash
curl -s http://localhost:3000/api/tickets \
  -X POST -H "Content-Type: application/json" \
  -d '{"title":"API 설계 문서 작성"}' -w "\nHTTP_STATUS:%{http_code}\n"
```

**실제 검증된 결과** (이 문서 작성 시 로컬에서 직접 실행):

```
{"id":...,"title":"API 설계 문서 작성","description":null,"status":"BACKLOG",
 "priority":"MEDIUM","position":...,"plannedStartDate":null,"dueDate":null,
 "startedAt":null,"completedAt":null,"createdAt":"...","updatedAt":"..."}
HTTP_STATUS:201
```

### 실패 케이스 (제목 누락)

```bash
curl -s http://localhost:3000/api/tickets \
  -X POST -H "Content-Type: application/json" \
  -d '{}' -w "\nHTTP_STATUS:%{http_code}\n"
```

**실제 검증된 결과**:

```
{"error":{"code":"VALIDATION_ERROR","message":"제목을 입력해주세요"}}
HTTP_STATUS:400
```

## 3. 결과가 계약과 다르다면

`specs/001-create-ticket/contracts/post-tickets.md`와 `docs/API_SPEC.md` §1을 다시 확인한다.
구현이 계약과 다르면 구현을 고치고, 계약 자체가 실제 요구사항과 다르다고 판단되면 `docs/`를 먼저
수정한 뒤 계약과 구현을 맞춘다 (constitution 원칙 I).

## 참고

- 전체 요청/응답 스펙: [contracts/post-tickets.md](./contracts/post-tickets.md)
- 데이터 모델: [data-model.md](./data-model.md)
