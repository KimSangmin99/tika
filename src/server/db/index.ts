import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// 로컬/테스트 환경은 표준 TCP Postgres(pg)로 접속한다.
// (docs가 지정한 @vercel/postgres는 Neon 전용 HTTP 프로토콜이라 로컬 Postgres에 접속할 수 없어
//  node-postgres로 대체했다 — 실제 Vercel/Neon 배포 시에는 별도로 교체가 필요하다.)
// 테스트가 실행 종료 시 커넥션을 닫을 수 있도록 export한다 (미종료 시 Jest가 종료되지 않음).
export const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

export const db = drizzle(pool, { schema });
