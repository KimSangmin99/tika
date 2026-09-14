import { BoardContainer } from '@/client/components/board/BoardContainer';
import { getBoard } from '@/server/services/ticketService';

// 서버 컴포넌트에서 초기 보드를 읽어 클라이언트 컨테이너에 넘긴다
// (docs/COMPONENT_SPEC.md §1 계층 구조).
// 보드는 매 요청마다 최신이어야 하므로 캐시하지 않는다.
export const dynamic = 'force-dynamic';

export default async function BoardPage() {
  const { board } = await getBoard();

  return (
    <main className="min-h-screen bg-white">
      <BoardContainer initialData={board} />
    </main>
  );
}
