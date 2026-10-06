import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { analyzeSvg } from '../src/domain/svg';

/**
 * The fixtures were built as an oracle: each one names the category or the risk
 * it exists to exercise. The analysis is pure over the text, so the test reads
 * the real files and asserts on the real classification.
 */
function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/assets/svg/${name}`, import.meta.url), 'utf8');
}

describe('analyzeSvg — classification', () => {
  it('reads geometry-only files as pure vector', () => {
    expect(analyzeSvg(fixture('simple.svg')).composition).toBe('pure-vector');
    expect(analyzeSvg(fixture('gradient.svg')).composition).toBe('pure-vector');
  });

  it('reads a file whose visible content is a bitmap as a raster wrapper', () => {
    expect(analyzeSvg(fixture('raster-wrapper.svg')).composition).toBe('raster-wrapper');
  });

  it('reads vector plus raster as mixed', () => {
    expect(analyzeSvg(fixture('mixed.svg')).composition).toBe('mixed');
  });

  it('reads filters, masks and text as complex vector', () => {
    expect(analyzeSvg(fixture('filter.svg')).composition).toBe('complex-vector');
    expect(analyzeSvg(fixture('mask.svg')).composition).toBe('complex-vector');
    expect(analyzeSvg(fixture('text.svg')).composition).toBe('complex-vector');
  });
});

describe('analyzeSvg — risks', () => {
  it('reports no risk for a clean geometry-only file', () => {
    expect(analyzeSvg(fixture('simple.svg')).risks).toEqual([]);
  });

  it('reports the risk each fixture exists to exercise', () => {
    expect(analyzeSvg(fixture('mixed.svg')).risks).toContain('embedded-raster');
    expect(analyzeSvg(fixture('raster-wrapper.svg')).risks).toContain('embedded-raster');
    expect(analyzeSvg(fixture('no-viewbox.svg')).risks).toContain('missing-viewbox');
    expect(analyzeSvg(fixture('external-reference.svg')).risks).toContain('external-reference');
    expect(analyzeSvg(fixture('broken-reference.svg')).risks).toContain('broken-reference');
    expect(analyzeSvg(fixture('filter.svg')).risks).toContain('complex-filter');
    expect(analyzeSvg(fixture('mask.svg')).risks).toContain('mask');
    expect(analyzeSvg(fixture('text.svg')).risks).toContain('text-dependent-rendering');
  });

  it('reads the real repository logos without losing the filter risk', () => {
    const analysis = analyzeSvg(fixture('logo-imaginizim-dark.svg'));

    expect(analysis.parse.valid).toBe(true);
    expect(analysis.risks).toContain('complex-filter');
  });
});

describe('analyzeSvg — parsing', () => {
  it('accepts well-formed SVG', () => {
    const analysis = analyzeSvg(fixture('simple.svg'));

    expect(analysis.parse.valid).toBe(true);
    expect(analysis.parse.errors).toEqual([]);
  });

  it('rejects a document whose root is not svg', () => {
    const analysis = analyzeSvg('<div><rect/></div>');

    expect(analysis.parse.valid).toBe(false);
    expect(analysis.parse.errors.map((error) => error.code)).toContain('no-svg-root');
  });

  it('rejects unbalanced tags', () => {
    const analysis = analyzeSvg('<svg><rect></svg>');

    expect(analysis.parse.valid).toBe(false);
    expect(analysis.parse.errors.map((error) => error.code)).toContain('unbalanced-tag');
  });

  it('rejects a file that is not markup at all', () => {
    expect(analyzeSvg('just some bytes, not xml').parse.valid).toBe(false);
  });

  it('ignores comments and CDATA when counting', () => {
    const analysis = analyzeSvg(
      '<svg viewBox="0 0 1 1"><!-- <rect/> --><![CDATA[ <circle/> ]]><path d="M0 0"/></svg>'
    );

    expect(analysis.structure.elements.paths).toBe(1);
    expect(analysis.structure.elements.rects).toBe(0);
    expect(analysis.structure.elements.circles).toBe(0);
  });
});
