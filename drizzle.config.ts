import { defineConfig } from 'drizzle-kit';

// 스키마 소스 파일(src/server/db/schema.ts)은 아직 존재하지 않는다.
// TDD Green 단계에서 DATA_MODEL.md 정의에 따라 작성한 뒤 db:generate/db:migrate를 실행한다.
export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
});
