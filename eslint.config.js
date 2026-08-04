import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dist-admin', 'dist-viewer']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // 폴더 경계. CLAUDE.md "레포 구조"의 규칙을 여기서 강제한다 — 관습으로 두면 샌다.
  // 기본 규칙 대신 typescript-eslint 것을 쓴다. `import type`도 잡아야 하기 때문이다.
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', {
        patterns: [{
          group: ['@/admin/*', '@/admin/**', '@/viewer/*', '@/viewer/**'],
          message: 'shared/는 admin/·viewer/를 import하지 않는다. 방향이 거꾸로다 — 필요한 타입은 shared/로 옮길 것.',
        }],
      }],
    },
  },
  {
    files: ['src/admin/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', {
        patterns: [{
          group: ['@/viewer/*', '@/viewer/**'],
          message: 'admin/과 viewer/는 서로 import하지 않는다. 양쪽이 쓰면 shared/로 올릴 것.',
        }],
      }],
    },
  },
  {
    files: ['src/viewer/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', {
        patterns: [{
          group: ['@/admin/*', '@/admin/**'],
          message: 'admin/과 viewer/는 서로 import하지 않는다. 양쪽이 쓰면 shared/로 올릴 것.',
        }],
      }],
    },
  },
])
