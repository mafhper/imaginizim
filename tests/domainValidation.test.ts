import { describe, it, expect } from 'vitest';
import { createValidationReport } from '../src/domain/validation';

describe('createValidationReport', () => {
  it('is ok when there are no issues', () => {
    expect(createValidationReport([])).toEqual({ ok: true, issues: [] });
  });

  it('is ok with warnings and info', () => {
    const report = createValidationReport([
      { code: 'w', severity: 'warning', message: 'w' },
      { code: 'i', severity: 'info', message: 'i' }
    ]);

    expect(report.ok).toBe(true);
    expect(report.issues).toHaveLength(2);
  });

  it('is not ok when any issue is an error', () => {
    const report = createValidationReport([
      { code: 'w', severity: 'warning', message: 'w' },
      { code: 'e', severity: 'error', message: 'e' }
    ]);

    expect(report.ok).toBe(false);
  });
});
