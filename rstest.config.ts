import { defineConfig } from '@rstest/core'

export default defineConfig({
  testEnvironment: 'jsdom',
  // The example app has its own vitest setup (example/vite.config.ts). Keep it
  // out of the library run so `pnpm test` only covers `tests/`.
  exclude: ['**/node_modules/**', 'example/**', '**/.worktrees/**'],
  coverage: {
    enabled: true,
  },
})
