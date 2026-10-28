import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Match the Next.js / tsconfig path alias
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    include: ['lib/**/*.{test,spec}.{ts,tsx}', 'components/**/*.{test,spec}.{ts,tsx}', 'app/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Only measure source files we actually own — exclude generated stuff
      include: ['lib/**/*.ts', 'components/**/*.tsx'],
      exclude: [
        '**/*.{test,spec}.{ts,tsx}',
        '**/*.d.ts',
        // Exclude pure type files
        '**/types/**',
      ],
      // Targets for portfolio grade — be honest, raise as we write more tests
      thresholds: {
        statements: 40,
        branches: 60,
        functions: 50,
        lines: 40,
      },
    },
  },
});
