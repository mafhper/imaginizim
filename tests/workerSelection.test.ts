import { describe, it, expect } from 'vitest';
import { selectManual, selectAutomatic, type Selection } from '../src/worker/selection/select';

/**
 * The worker's final choice used to be inline, so this regression could not be
 * reached without a worker environment. The bug: with the default `original`
 * output, a retained original always reported `metTarget: false`, even when it
 * was under the target all along.
 */

function blob(size: number): Blob {
  return new Blob([new Uint8Array(size)]);
}

function file(size: number): File {
  return new File([new Uint8Array(size)], 'photo.png', { type: 'image/png' });
}

function candidate(size: number, overrides: Partial<Selection> = {}): Selection {
  return {
    blob: blob(size),
    format: 'image/webp',
    qualityScore: 1,
    strategyUsed: 'auto-photo-balanced',
    ...overrides
  };
}

const KB = 1024;

describe('selectManual', () => {
  it('keeps the original when the re-encode grew, and reports the target met if it fits', () => {
    const source = file(50 * KB);
    const grown = candidate(60 * KB, { metTarget: true, budgetAttempts: 3 });

    const result = selectManual(grown, 'original', 'image/png', source, 'balanced', 100 * KB);

    expect(result.blob).toBe(source);
    expect(result.strategyUsed).toBe('manual-original-retained-balanced');
    // The regression: this used to be `false`, so the UI said "target not met"
    // on a 50 KB file with a 100 KB target.
    expect(result.metTarget).toBe(true);
  });

  it('reports the target missed when the retained original is over the target', () => {
    const source = file(200 * KB);
    const grown = candidate(220 * KB);

    const result = selectManual(grown, 'original', 'image/png', source, 'balanced', 100 * KB);

    expect(result.blob).toBe(source);
    expect(result.metTarget).toBe(false);
  });

  it('carries no budget verdict for a retained original when no target was asked', () => {
    const source = file(200 * KB);
    const grown = candidate(220 * KB);

    const result = selectManual(grown, 'original', 'image/png', source, 'balanced', null);

    expect(result.metTarget).toBeUndefined();
  });

  it('passes the encoded candidate through, with its budget metadata', () => {
    const source = file(100 * KB);
    const encoded = candidate(80 * KB, { metTarget: true, budgetAttempts: 2 });

    const result = selectManual(encoded, 'image/webp', 'image/png', source, 'balanced', 100 * KB);

    expect(result.blob).toBe(encoded.blob);
    expect(result.metTarget).toBe(true);
    expect(result.budgetAttempts).toBe(2);
  });

  it('does not retain the original when the encode is smaller', () => {
    const source = file(100 * KB);
    const encoded = candidate(80 * KB);

    const result = selectManual(encoded, 'original', 'image/png', source, 'balanced', null);

    expect(result.blob).toBe(encoded.blob);
    expect(result.strategyUsed).toBe('auto-photo-balanced');
  });
});

describe('selectAutomatic', () => {
  it('picks the smallest viable candidate and carries its budget verdict', () => {
    const small = candidate(80 * KB, { metTarget: true, budgetAttempts: 4 });
    const big = candidate(200 * KB, { metTarget: true });

    const result = selectAutomatic([big, small], 0.87, 100 * KB);

    expect(result.blob).toBe(small.blob);
    expect(result.metTarget).toBe(true);
    expect(result.budgetAttempts).toBe(4);
  });

  it('falls back to a size comparison when the entry carries no verdict', () => {
    const fits = selectAutomatic([candidate(90 * KB)], 0.87, 100 * KB);
    const over = selectAutomatic([candidate(150 * KB)], 0.87, 100 * KB);

    expect(fits.metTarget).toBe(true);
    expect(over.metTarget).toBe(false);
  });

  it('carries no budget verdict when no target was asked', () => {
    const result = selectAutomatic([candidate(90 * KB)], 0.87, null);

    expect(result.metTarget).toBeUndefined();
  });

  it('throws when nothing is viable', () => {
    expect(() => selectAutomatic([], 0.87, null)).toThrow(/No valid compression candidate/);
  });
});
