import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// 로컬/테스트 환경은 표준 TCP Postgres(pg)로 접속한다.
// (docs가 지정한 @vercel/postgres는 Neon 전용 HTTP 프로토콜이라 로컬 Postgres에 접속할 수 없어
//  node-postgres로 대체했다 — 실제 Vercel/Neon 배포 시에는 별도로 교체가 필요하다.)
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

export const db = drizzle(pool, { schema });
