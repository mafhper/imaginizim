/**
 * A validation report is `ok` unless some issue is an `error`. Warnings and
 * info are recorded but never fail the artifact — the same distinction the
 * quality score draws between "unverified" and "bad".
 */

import type { ValidationIssue, ValidationReport } from './types';

export function createValidationReport(issues: ValidationIssue[]): ValidationReport {
  return {
    ok: !issues.some((issue) => issue.severity === 'error'),
    issues
  };
}
