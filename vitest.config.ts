import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{js,ts}'],
    exclude: ['.dev/**', 'node_modules/**', 'dist/**', 'tests/**/*.spec.ts']
  }
});
