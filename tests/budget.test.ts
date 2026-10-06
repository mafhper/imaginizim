import { describe, it, expect } from 'vitest';
import { encodeWithinBudget, type BudgetPlan } from '../src/worker/selection/budget';

/**
 * The budget ladder is a byte contract: "the output must fit in `targetBytes`".
 * The encoder is injected, so the ladder is tested without a canvas — the seam
 * is the decision (which quality to keep), not the codec.
 *
 * The fake encoder is monotonic: lower quality, smaller output. That is the
 * real-world shape the ladder relies on, and it is *independent* of the module
 * under test (a known-bad literal mapping), so the assertions cannot pass by
 * recomputing the same formula.
 */
function fakeEncoder(sizeFor: (quality: number) => number) {
  const calls: number[] = [];
  return {
    calls,
    encode: async (quality: number) => {
      calls.push(quality);
      return new Blob([new Uint8Array(Math.max(1, Math.round(sizeFor(quality))))]);
    }
  };
}

function plan(overrides: Partial<BudgetPlan>): BudgetPlan {
  return {
    targetBytes: 60,
    startQuality: 0.9,
    minQuality: 0.35,
    qualityStep: 0.07,
    maxAttempts: 10,
    ...overrides
  };
}

describe('encodeWithinBudget', () => {
  it('keeps the highest quality whose output fits, and stops there', async () => {
    const { calls, encode } = fakeEncoder((q) => q * 100);

    const outcome = await encodeWithinBudget(encode, plan({ targetBytes: 60 }));

    // 0.90→90, 0.83→83, 0.76→76, 0.69→69, 0.62→62, 0.55→55 ≤ 60
    expect(calls.map((q) => Math.round(q * 100))).toEqual([90, 83, 76, 69, 62, 55]);
    expect(outcome.metTarget).toBe(true);
    expect(outcome.attempts).toBe(6);
    expect(outcome.blob.size).toBe(55);
    expect(outcome.quality).toBeCloseTo(0.55, 5);
  });

  it('encodes at the starting quality first, not below it', async () => {
    const { calls, encode } = fakeEncoder((q) => q * 100);

    const outcome = await encodeWithinBudget(encode, plan({ targetBytes: 500 }));

    expect(calls).toHaveLength(1);
    expect(calls[0]).toBeCloseTo(0.9, 5);
    expect(outcome.metTarget).toBe(true);
  });

  it('reports failure and returns the smallest attempt when nothing fits', async () => {
    const { calls, encode } = fakeEncoder((q) => q * 100);

    const outcome = await encodeWithinBudget(encode, plan({ targetBytes: 10 }));

    // 0.90 … 0.41 (next would be 0.34 < minQuality 0.35, so it stops).
    expect(calls).toHaveLength(8);
    expect(outcome.metTarget).toBe(false);
    expect(outcome.attempts).toBe(8);
    expect(outcome.quality).toBeCloseTo(0.41, 5);
    expect(outcome.blob.size).toBe(41);
  });

  it('never exceeds maxAttempts, even when the target is unreachable', async () => {
    const { calls, encode } = fakeEncoder((q) => q * 100);

    const outcome = await encodeWithinBudget(
      encode,
      plan({ targetBytes: 0, minQuality: 0, maxAttempts: 3 })
    );

    expect(calls).toHaveLength(3);
    expect(outcome.attempts).toBe(3);
    expect(outcome.metTarget).toBe(false);
  });

  it('clamps a start quality below the floor up to the floor', async () => {
    const { calls, encode } = fakeEncoder((q) => q * 100);

    const outcome = await encodeWithinBudget(encode, plan({ targetBytes: 40, startQuality: 0.2 }));

    expect(calls[0]).toBeCloseTo(0.35, 5);
    expect(outcome.metTarget).toBe(true);
  });
});
