import { describe, expect, it } from 'vitest';
import { chooseCandidate, type EvaluatedCandidate } from '../src/worker/selection/choose';
import { getQualityThreshold } from '../src/worker/selection/strategy';

function candidate(format: string, size: number, qualityScore: number | null): EvaluatedCandidate {
  return {
    blob: new Blob([new Uint8Array(size)]),
    format,
    qualityScore,
    strategyUsed: `auto-${format}`
  };
}

const BALANCED = getQualityThreshold('balanced');

describe('choosing a candidate', () => {
  it('picks the smallest candidate that clears the threshold', () => {
    const selected = chooseCandidate(
      [
        candidate('image/avif', 900, 0.91),
        candidate('image/webp', 300, 0.93),
        candidate('image/jpeg', 120, 0.5)
      ],
      BALANCED
    );

    expect(selected?.format).toBe('image/webp');
  });

  it('never treats an unmeasured candidate as if it had passed', () => {
    // Why this matters: the old failure path returned a hardcoded 0.88, and
    // `balanced` is 0.87. So a scoring failure scored as a *pass*.
    expect(0.88).toBeGreaterThan(BALANCED);

    const selected = chooseCandidate(
      [
        // Unmeasurable, and the smaller blob — under the old scoring this won
        // the gate outright.
        candidate('image/avif', 100, null),
        // Measured, and genuinely below the threshold.
        candidate('image/webp', 900, 0.62)
      ],
      BALANCED
    );

    expect(selected?.format).toBe('image/webp');
    expect(selected?.qualityScore).toBe(0.62);
  });

  it('would have picked differently under the old hardcoded failure score', () => {
    // The regression, stated as a counterfactual: replay the old arithmetic on
    // the same pool and show it chose the unmeasured candidate.
    const pool = [candidate('image/avif', 100, null), candidate('image/webp', 900, 0.62)];
    const asIfScored = pool.map((item) =>
      item.qualityScore === null ? { ...item, qualityScore: 0.88 } : item
    );

    const oldWinner = asIfScored
      .filter((item) => (item.qualityScore ?? 0) >= BALANCED)
      .sort((a, b) => a.blob.size - b.blob.size)[0];

    expect(oldWinner.format).toBe('image/avif');
    expect(chooseCandidate(pool, BALANCED)?.format).toBe('image/webp');
  });

  it('prefers a measured candidate over an unmeasured one regardless of size', () => {
    const selected = chooseCandidate(
      [candidate('image/avif', 100, null), candidate('image/jpeg', 900, 0.5)],
      BALANCED
    );

    expect(selected?.format).toBe('image/jpeg');
  });

  it('falls back to the best measured score when nothing clears the threshold', () => {
    const selected = chooseCandidate(
      [candidate('image/avif', 100, 0.5), candidate('image/webp', 900, 0.8)],
      BALANCED
    );

    expect(selected?.format).toBe('image/webp');
    expect(selected?.qualityScore).toBe(0.8);
  });

  it('breaks a score tie by size', () => {
    const selected = chooseCandidate(
      [candidate('image/avif', 800, 0.8), candidate('image/webp', 300, 0.8)],
      BALANCED
    );

    expect(selected?.format).toBe('image/webp');
  });

  it('uses the smallest unmeasured candidate only when nothing was measurable', () => {
    const selected = chooseCandidate(
      [candidate('image/avif', 800, null), candidate('image/webp', 300, null)],
      BALANCED
    );

    expect(selected?.format).toBe('image/webp');
    // And it says so, rather than claiming a score.
    expect(selected?.qualityScore).toBeNull();
  });

  it('returns undefined for an empty pool', () => {
    expect(chooseCandidate([], BALANCED)).toBeUndefined();
  });

  it('does not reorder the pool it was given', () => {
    const pool = [
      candidate('image/avif', 100, 0.5),
      candidate('image/webp', 900, 0.99),
      candidate('image/jpeg', 500, 0.95)
    ];
    const before = pool.map((item) => item.format);

    chooseCandidate(pool, BALANCED);

    expect(pool.map((item) => item.format)).toEqual(before);
  });
});
