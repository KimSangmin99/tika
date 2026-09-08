import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit CLI는 Next.js와 달리 .env.local을 자동으로 읽지 않으므로 직접 로드한다.
config({ path: '.env.local' });

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
});
