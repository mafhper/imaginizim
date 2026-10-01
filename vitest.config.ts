import { defineConfig } from 'vitest/config';

const sharedExclude = ['.dev/**', 'node_modules/**', 'dist/**', 'tests/**/*.spec.ts'];

export default defineConfig({
  test: {
    projects: [
      {
        // Pure logic: no DOM needed. Stays on `node` because it is faster and
        // catches accidental browser-only globals in engine code.
        test: {
          name: 'node',
          include: ['tests/**/*.test.{js,ts}'],
          exclude: [...sharedExclude, 'tests/**/*.dom.test.{js,ts,tsx}'],
          environment: 'node'
        }
      },
      {
        // Anything that needs a document, a component, or a canvas stand-in.
        test: {
          name: 'dom',
          include: ['tests/**/*.dom.test.{js,ts,tsx}'],
          exclude: sharedExclude,
          environment: 'happy-dom',
          setupFiles: ['tests/setup/dom.ts']
        }
      }
    ]
  }
});
