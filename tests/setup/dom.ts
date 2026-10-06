import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll } from 'vitest';
import { initI18n } from '../../src/i18n';

beforeAll(async () => {
  // Without this, `t()` returns the raw key and every component test would be
  // asserting on `app.density_compact` instead of the copy a user sees.
  await initI18n();
});

afterEach(() => {
  cleanup();
});
