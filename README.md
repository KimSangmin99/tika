# Tika - Ticket-based Kanban Board

> 티켓 기반 칸반 보드 할 일 관리 애플리케이션 (MVP)

단일 사용자 환경에서 티켓을 생성하고, 4개 칼럼(Backlog, TODO, In Progress, Done) 간 드래그앤드롭으로 상태를 관리하는 칸반 보드 앱이다.

---

## 주요 기능

| ID | 기능 | 설명 |
|----|------|------|
| FR-001 | 티켓 생성 | 제목, 설명, 우선순위, 시작예정일, 종료예정일 입력. Backlog 맨 위에 배치 |
| FR-002 | 보드 조회 | 4개 칼럼별 그룹화, position 오름차순 정렬 |
| FR-003 | 티켓 상세 | 카드 클릭 시 모달로 전체 정보 표시 |
| FR-004 | 티켓 수정 | 제목, 설명, 우선순위, 시작예정일, 종료예정일 수정 |
| FR-005 | 티켓 완료 | Done 이동 시 completedAt 자동 설정, 24시간 경과 시 보드에서 제외 |
| FR-006 | 티켓 삭제 | 확인 다이얼로그 후 영구 삭제 |
| FR-007 | 드래그앤드롭 | 칼럼 간/내 이동, startedAt/completedAt 자동 관리 |
| FR-008 | 오버듀 판정 | 종료예정일 초과 + 미완료 티켓에 시각적 경고 |

## 기술 스택

### 프론트엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 15.x | 풀스택 프레임워크 (App Router) |
| React | 19.x | UI 렌더링 |
| TypeScript | 5.x | 타입 안전성 (strict mode) |
| Tailwind CSS | 4.x | 유틸리티 기반 스타일링 |
| @dnd-kit | core 6.x / sortable 8.x | 드래그앤드롭 |

### 백엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| Drizzle ORM | 0.38.x | DB 쿼리, 스키마 관리 |
| @vercel/postgres | latest | Vercel Postgres 연결 드라이버 |
| Zod | 3.x | 요청/폼 데이터 검증 (프론트/백엔드 공유) |

### 개발 도구

| 기술 | 용도 |
|------|------|
| Jest + React Testing Library | TDD 테스트 |
| ESLint | 린트 |
| Prettier | 코드 포맷팅 |
| Drizzle Kit | DB 마이그레이션 |

---

## 프로젝트 구조

```
tika/
├── app/                              # Next.js App Router
│   ├── api/                          # 백엔드: API Route Handlers
│   │   └── tickets/
│   │       ├── route.ts              # GET /api/tickets, POST /api/tickets
│   │       ├── [id]/
│   │       │   ├── route.ts          # GET, PATCH, DELETE /api/tickets/:id
│   │       │   └── complete/
│   │       │       └── route.ts      # PATCH /api/tickets/:id/complete
│   │       └── reorder/
│   │           └── route.ts          # PATCH /api/tickets/reorder
│   │
│   ├── (board)/                      # 프론트엔드: 페이지 그룹
│   │   ├── page.tsx                  # 메인 칸반 보드 페이지
│   │   └── layout.tsx                # 보드 레이아웃
│   ├── layout.tsx                    # 루트 레이아웃
│   └── globals.css                   # 글로벌 스타일 + Tailwind
│
├── src/
│   ├── server/                       # 백엔드 로직 (서버에서만 실행)
│   │   ├── services/
│   │   │   └── ticketService.ts      # 비즈니스 로직
│   │   ├── db/
│   │   │   ├── index.ts              # Drizzle 클라이언트 초기화
│   │   │   ├── schema.ts             # DB 스키마 정의
│   │   │   └── seed.ts               # 시드 데이터
│   │   └── middleware/
│   │       ├── errorHandler.ts       # 에러 처리
│   │       └── validate.ts           # Zod 검증 유틸리티
│   │
│   ├── client/                       # 프론트엔드 로직 (브라우저에서 실행)
│   │   ├── components/
│   │   │   ├── board/                # Board, Column, TicketCard
│   │   │   ├── ticket/               # TicketModal, TicketForm
│   │   │   └── ui/                   # Button, Modal, Badge, ConfirmDialog
│   │   ├── hooks/
│   │   │   └── useTickets.ts         # 티켓 CRUD + DnD 상태 관리
│   │   └── api/
│   │       └── ticketApi.ts          # API 호출 함수 (fetch 래퍼)
│   │
│   └── shared/                       # 프론트/백엔드 공유 코드
│       ├── types/
│       │   └── index.ts              # Ticket, BoardData, API 타입
│       ├── validations/
│       │   └── ticket.ts             # Zod 스키마 (폼 + API 검증)
│       └── constants.ts              # 칼럼명, 우선순위 등 상수
│
├── __tests__/                        # 테스트 코드
│   ├── api/                          # API Route 테스트
│   ├── services/                     # 서비스 단위 테스트
│   ├── components/                   # 컴포넌트 테스트
│   └── hooks/                        # Hook 테스트
│
├── docs/                             # 프로젝트 명세 문서
├── drizzle/                          # Drizzle 마이그레이션
├── CLAUDE.md                         # Claude Code 프로젝트 설정
├── drizzle.config.ts
├── next.config.ts
├── jest.config.ts
├── tsconfig.json
└── package.json
```

### 계층 간 경계 규칙

| 규칙 | 설명 |
|------|------|
| `src/server/` → `src/client/` import 금지 | 백엔드에서 프론트엔드 코드 참조 불가 |
| `src/client/` → `src/server/` import 금지 | 프론트엔드에서 백엔드 코드 직접 참조 불가 |
| `src/shared/`만 양쪽에서 참조 가능 | 타입, Zod 스키마, 상수만 공유 |

---

## API 엔드포인트

| # | 메서드 | 경로 | 설명 |
|---|--------|------|------|
| 1 | POST | /api/tickets | 티켓 생성 |
| 2 | GET | /api/tickets | 전체 보드 조회 |
| 3 | GET | /api/tickets/:id | 티켓 상세 조회 |
| 4 | PATCH | /api/tickets/:id | 티켓 수정 |
| 5 | PATCH | /api/tickets/:id/complete | 티켓 완료 |
| 6 | DELETE | /api/tickets/:id | 티켓 삭제 |
| 7 | PATCH | /api/tickets/reorder | 상태/순서 변경 (DnD) |

> Done으로의 이동은 `/complete`, 그 외 모든 이동은 `/reorder`를 사용한다.

---

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일에 `POSTGRES_URL` 값을 설정한다.

**Vercel Postgres 사용 시:**
```bash
vercel env pull .env.local
```

**로컬 PostgreSQL 사용 시:**
```
POSTGRES_URL=postgresql://username:password@localhost:5432/tika
```

### 3. DB 마이그레이션

```bash
npm run db:generate   # 마이그레이션 파일 생성
npm run db:migrate    # 마이그레이션 적용
```

### 4. (선택) 시드 데이터

```bash
npm run db:seed
```

### 5. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인

---

## 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run test` | 테스트 실행 |
| `npm run test:watch` | 테스트 감시 모드 |
| `npm run db:generate` | DB 마이그레이션 생성 |
| `npm run db:migrate` | DB 마이그레이션 적용 |
| `npm run db:studio` | Drizzle Studio (DB GUI) |
| `npm run db:seed` | 시드 데이터 삽입 |
| `npm run lint` | ESLint 검사 |
| `npm run format` | Prettier 포맷팅 |

---

## 프로젝트 문서

| 문서 | 설명 |
|------|------|
| [PRD.md](docs/PRD.md) | 제품 요구사항 (시나리오, 와이어프레임, FR/NFR) |
| [TRD.md](docs/TRD.md) | 기술 요구사항 (아키텍처, 기술 스택, 디렉토리 구조) |
| [REQUIREMENTS.md](docs/REQUIREMENTS.md) | 상세 요구사항 (FR, NFR, US, 추적 매트릭스) |
| [API_SPEC.md](docs/API_SPEC.md) | 7개 REST API 엔드포인트 명세 |
| [DATA_MODEL.md](docs/DATA_MODEL.md) | DB 스키마, Drizzle 정의, 비즈니스 규칙 |
| [COMPONENT_SPEC.md](docs/COMPONENT_SPEC.md) | 컴포넌트 계층, Props, 이벤트 흐름, Hook 명세 |
| [TEST_CASES.md](docs/TEST_CASES.md) | TDD용 테스트 케이스 (API + 컴포넌트 + 통합) |

---

## 개발 방식

이 프로젝트는 Claude Code와 함께 TDD 방식으로 개발하도록 설계되었다.

```bash
# Claude Code 실행
claude

# CLAUDE.md를 참고하도록 요청
> CLAUDE.md를 읽고 프로젝트 컨텍스트를 파악해줘
```

개발 순서:
1. **백엔드 (Chapter 5)**: TEST_CASES.md의 TC-API 기반으로 TDD 사이클 진행
2. **프론트엔드 (Chapter 6)**: TC-COMP, TC-INT 기반으로 컴포넌트 구현

---

## 라이선스

MIT
