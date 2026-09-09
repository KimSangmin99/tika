import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const moduleNameMapper = {
  '^@/(.*)$': '<rootDir>/src/$1',
};

// __tests__/api, __tests__/services: Route Handler / 서비스 계층 테스트 → node 환경
/** @type {import('jest').Config} */
const serverProjectConfig = {
  displayName: 'server',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/__tests__/api/**/*.test.ts',
    '<rootDir>/__tests__/services/**/*.test.ts',
  ],
  moduleNameMapper,
};

// __tests__/components, __tests__/hooks: React 컴포넌트/훅 테스트 → jsdom 환경
/** @type {import('jest').Config} */
const clientProjectConfig = {
  displayName: 'client',
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/__tests__/components/**/*.test.tsx',
    '<rootDir>/__tests__/hooks/**/*.test.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper,
};

/** @type {() => Promise<import('jest').Config>} */
const config = async () => {
  const [server, client] = await Promise.all([
    createJestConfig(serverProjectConfig)(),
    createJestConfig(clientProjectConfig)(),
  ]);

  return {
    projects: [server, client],
    // API 테스트는 실제 Postgres(tika_test)를 공유한다. GET /api/tickets처럼 테이블 전체를
    // 조회하는 테스트가 다른 테스트 파일이 삽입한 행에 오염되지 않도록 직렬 실행한다.
    maxWorkers: 1,
  };
};

export default config;
