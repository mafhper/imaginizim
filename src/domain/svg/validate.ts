import { buildStructure } from './structure';
import { tokenizeSvg } from './tokenize';
import type { ValidationIssue, ValidationReport } from '../types';
import { createValidationReport } from '../validation';

/**
 * Validation of an optimized SVG against its original.
 *
 * It is the answer to "did the optimizer break anything?" — and it is pure over
 * the two texts, so it is testable without SVGO and runs in the worker. The
 * checks are the ones that matter for a *lossless-looking* transformation:
 * parseable, viewBox preserved, no broken reference, and no raster or external
 * dependency introduced.
 */

export interface SvgValidationInput {
  original: string;
  optimized: string;
  artifactId?: string;
}

export function validateSvg({
  original,
  optimized,
  artifactId
}: SvgValidationInput): ValidationReport {
  const issues: ValidationIssue[] = [];
  const issue = (code: string, message: string): ValidationIssue => ({
    code,
    severity: 'error',
    message,
    artifactId
  });

  const optimizedTokens = tokenizeSvg(optimized);
  if (optimizedTokens.errors.length > 0) {
    issues.push(
      issue('svg-unparseable', `optimized SVG is not parseable: ${optimizedTokens.errors[0].code}`)
    );
    return createValidationReport(issues);
  }

  const originalStructure = buildStructure(tokenizeSvg(original).tags);
  const optimizedStructure = buildStructure(optimizedTokens.tags);

  const originalViewBox = originalStructure.viewBox?.join(' ');
  const optimizedViewBox = optimizedStructure.viewBox?.join(' ');
  if (originalViewBox && originalViewBox !== optimizedViewBox) {
    issues.push(
      issue(
        'viewbox-changed',
        `viewBox changed: ${originalViewBox} → ${optimizedViewBox ?? 'none'}`
      )
    );
  }

  if (optimizedStructure.references.broken > 0) {
    issues.push(
      issue(
        'broken-reference',
        `${optimizedStructure.references.broken} reference(s) point to no id`
      )
    );
  }

  if (optimizedStructure.references.external > originalStructure.references.external) {
    issues.push(
      issue('external-reference-introduced', 'the optimization introduced an external reference')
    );
  }

  if (optimizedStructure.elements.images > originalStructure.elements.images) {
    issues.push(issue('raster-introduced', 'the optimization introduced a raster image'));
  }

  return createValidationReport(issues);
}
