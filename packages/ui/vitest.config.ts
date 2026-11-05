import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: { reporter: ['text', 'lcov'], include: ['src/**'] },
  },
  // Align with tsconfig.json paths: "@/*" -> "./*" (package root, not src/).
  // Both resolve @/foo to <package-root>/foo so TS and Vitest see the same file.
  // @farsight/* aliases point directly to TS source in the sibling monorepo.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@farsight/sdk': path.resolve(__dirname, '../../../farsight-platform/packages/sdk/src/index.ts'),
      '@farsight/contracts': path.resolve(__dirname, '../../../farsight-platform/packages/contracts/src/index.ts'),
    },
  },
})
