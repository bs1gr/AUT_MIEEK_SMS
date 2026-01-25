import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    exclude: ['node_modules', 'dist', 'src/__e2e__/**'],
    // Use forked processes instead of worker threads to mitigate
    // ERR_WORKER_OUT_OF_MEMORY on large suites in Windows
    pool: 'forks',
    // Ensure fully serial execution to keep memory usage low
    sequence: {
      files: 'serial',
      tests: 'serial'
    },
    maxThreads: 1,
    minThreads: 1,
    passWithNoTests: true
  }
});
