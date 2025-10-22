import { defineConfig } from '@rstest/core'

export default defineConfig({
  testEnvironment: 'jsdom',
  coverage: {
    enabled: true,
  },
})
