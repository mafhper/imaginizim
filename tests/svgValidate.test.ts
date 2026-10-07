import { describe, it, expect } from 'vitest';
import { validateSvg } from '../src/domain/svg';

const clean =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<defs><linearGradient id="g"/></defs>' +
  '<path d="M8 8h48v48H8z" fill="url(#g)"/>' +
  '</svg>';

describe('validateSvg', () => {
  it('is ok when nothing that matters changed', () => {
    expect(validateSvg({ original: clean, optimized: clean }).ok).toBe(true);
  });

  it('fails when the viewBox changed', () => {
    const optimized = clean.replace('viewBox="0 0 64 64"', 'viewBox="0 0 32 32"');

    const report = validateSvg({ original: clean, optimized });

    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toContain('viewbox-changed');
  });

  it('fails when a reference lost its id', () => {
    const optimized = clean.replace('<linearGradient id="g"/>', '');

    const report = validateSvg({ original: clean, optimized });

    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toContain('broken-reference');
  });

  it('fails when the optimized file is not parseable', () => {
    const report = validateSvg({ original: clean, optimized: '<svg><path></svg>' });

    expect(report.ok).toBe(false);
    expect(report.issues[0].code).toBe('svg-unparseable');
  });

  it('fails when a raster image is introduced', () => {
    const optimized = clean.replace('<path', '<image href="data:image/png;base64,AAAA"/><path');

    const report = validateSvg({ original: clean, optimized });

    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toContain('raster-introduced');
  });

  it('fails when an external reference is introduced', () => {
    const optimized = clean.replace(
      '<path',
      '<image href="https://example.invalid/logo.png"/><path'
    );

    const report = validateSvg({ original: clean, optimized });

    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toContain('external-reference-introduced');
  });

  it('carries the artifact id on every issue', () => {
    const optimized = clean.replace('viewBox="0 0 64 64"', '');

    const report = validateSvg({ original: clean, optimized, artifactId: 'webp' });

    expect(report.issues.every((issue) => issue.artifactId === 'webp')).toBe(true);
  });
});
