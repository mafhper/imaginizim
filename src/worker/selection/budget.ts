/**
 * The byte-budget ladder.
 *
 * A size target is a *contract*: "the output must fit in `targetBytes`". The
 * existing mode-based `maxSizeMB` is a ceiling the library happens to respect;
 * this module makes the contract explicit and, above all, *reports* whether it
 * was met.
 *
 * The mechanism is the one measured in iSparta-next's size gate: lower the
 * quality in steps and re-encode **from the master** each time — never on top of
 * an already-degraded artifact. Here the "master" is the caller's `encode`
 * closure, which is expected to render from the same source every call. That is
 * why the ladder is a pure function over an injected encoder: the decision is
 * testable without a canvas, and the no-accumulation property is a consequence
 * of the seam, not of a comment.
 *
 * `encode` is called with a strictly decreasing quality, starting at
 * `startQuality`, and the first attempt that fits is the winner. If nothing
 * fits before the quality floor or the attempt cap, the smallest attempt is
 * returned with `metTarget: false` — never a lie, and never a hardcoded "ok".
 */

export interface BudgetPlan {
  /** The contract, in bytes. */
  targetBytes: number;
  /** Quality of the first attempt. Clamped up to `minQuality`. */
  startQuality: number;
  /** Lowest quality the ladder is allowed to reach. */
  minQuality: number;
  /** How much quality drops between attempts. */
  qualityStep: number;
  /** Hard cap on encodes, so an unreachable target cannot spin forever. */
  maxAttempts: number;
}

export interface BudgetOutcome {
  blob: Blob;
  quality: number;
  metTarget: boolean;
  attempts: number;
}

export const BUDGET_DEFAULTS = {
  minQuality: 0.4,
  qualityStep: 0.07,
  maxAttempts: 12
} as const;

const PRECISION = 4;

function round(value: number): number {
  const factor = 10 ** PRECISION;
  return Math.round(value * factor) / factor;
}

export async function encodeWithinBudget(
  encode: (quality: number) => Promise<Blob>,
  plan: BudgetPlan
): Promise<BudgetOutcome> {
  const minQuality = Math.min(Math.max(plan.minQuality, 0), 1);
  const maxAttempts = Math.max(1, Math.floor(plan.maxAttempts));
  const qualityStep = Math.max(plan.qualityStep, 0.001);

  let quality = Math.min(Math.max(plan.startQuality, minQuality), 1);
  let bestBlob: Blob | null = null;
  let bestQuality = quality;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const blob = await encode(quality);
    attempts += 1;
    bestBlob = blob;
    bestQuality = quality;

    if (blob.size <= plan.targetBytes) {
      return { blob, quality, metTarget: true, attempts };
    }

    const next = round(quality - qualityStep);
    if (next < minQuality || next >= quality) break;
    quality = next;
  }

  // `bestBlob` cannot be null: `maxAttempts` is at least 1 and one encode always runs.
  return { blob: bestBlob as Blob, quality: bestQuality, metTarget: false, attempts };
}
