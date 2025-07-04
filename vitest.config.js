import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.{test,spec}.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['lib/**', 'bin/**'],
      exclude: [
        'lib/dashboard/static/**',
        'node_modules/**'
      ]
    }
  }
})