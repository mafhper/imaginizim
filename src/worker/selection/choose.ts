import type { QualityScore } from '../types';

export interface EvaluatedCandidate {
  blob: Blob;
  format: string;
  /** `null` when similarity could not be measured. */
  qualityScore: QualityScore;
  strategyUsed: string;
}

function bySizeAscending(a: EvaluatedCandidate, b: EvaluatedCandidate): number {
  return a.blob.size - b.blob.size;
}

function isMeasured(
  candidate: EvaluatedCandidate
): candidate is EvaluatedCandidate & { qualityScore: number } {
  return candidate.qualityScore !== null;
}

/**
 * Picks the winning candidate for automatic selection.
 *
 * Preference order:
 *   1. clears the threshold, and is the smallest of those;
 *   2. otherwise the best measured (highest score, smallest on a tie);
 *   3. otherwise, only when nothing at all could be measured, the smallest
 *      unmeasured candidate.
 *
 * Step 3 exists so a worker that cannot decode anything still returns a usable
 * artifact — but it reports `qualityScore: null`, so "unverified" stays
 * distinguishable from "verified good". That distinction is the whole point:
 * the previous code returned a hardcoded `0.88` on failure, and `0.88` is above
 * the `balanced` threshold of `0.87`, so a scoring failure silently passed the
 * gate.
 */
export function chooseCandidate(
  candidates: EvaluatedCandidate[],
  threshold: number
): EvaluatedCandidate | undefined {
  if (candidates.length === 0) return undefined;

  const measured = candidates.filter(isMeasured);

  const viable = measured.filter((item) => item.qualityScore >= threshold).sort(bySizeAscending);
  if (viable[0]) return viable[0];

  const bestMeasured = [...measured].sort(
    (a, b) => b.qualityScore - a.qualityScore || bySizeAscending(a, b)
  )[0];
  if (bestMeasured) return bestMeasured;

  return [...candidates].filter((item) => !isMeasured(item)).sort(bySizeAscending)[0];
}
