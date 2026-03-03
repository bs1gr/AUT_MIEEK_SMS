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
    // Use worker threads for better isolation/stability with React+jsdom
    // suites on Windows where forked workers can leak memory.
    pool: 'threads',
    // Ensure fully serial execution to keep memory usage low
    sequence: {
      files: 'serial',
      tests: 'serial'
    },
    fileParallelism: false,
    minThreads: 1,
    maxThreads: 1,
    passWithNoTests: true
  }
});
