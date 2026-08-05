import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// CLAUDE.md / docs/TRD.md §4 경계 규칙:
// src/client ↔ src/server 상호 import 금지, 공유는 src/shared를 통해서만.
const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['src/client/**/*.ts', 'src/client/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/server/*', '@/server'],
              message:
                'src/client에서 src/server를 import할 수 없습니다 (CLAUDE.md 경계 규칙). 공유가 필요하면 src/shared를 사용하세요.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/server/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/client/*', '@/client'],
              message:
                'src/server에서 src/client를 import할 수 없습니다 (CLAUDE.md 경계 규칙). 공유가 필요하면 src/shared를 사용하세요.',
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
