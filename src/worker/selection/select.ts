import { chooseCandidate } from './choose';
import type { QualityScore, WorkerCompressionRequest } from '../types';

/**
 * The final choice, plus the budget verdict. This is the piece the worker used
 * to keep inline, which is why the `metTarget` bug below could hide: no test
 * could reach it without a worker environment.
 */
export interface Selection {
  blob: Blob;
  format: string;
  qualityScore: QualityScore;
  strategyUsed: string;
  metTarget?: boolean;
  budgetAttempts?: number;
}

function budgetRequested(targetBytes: number | null): boolean {
  return typeof targetBytes === 'number' && targetBytes > 0;
}

export function selectManual(
  manualCandidate: Selection,
  outputFormat: WorkerCompressionRequest['outputFormat'],
  originalType: string,
  file: File,
  mode: WorkerCompressionRequest['mode'],
  targetBytes: number | null
): Selection {
  const keepOriginal = outputFormat === 'original' && manualCandidate.blob.size >= file.size;
  if (keepOriginal) {
    return {
      blob: file,
      format: originalType,
      qualityScore: 1,
      strategyUsed: `manual-original-retained-${mode}`,
      // The untouched original meets the budget only if it already fits. This
      // used to be a hardcoded `false`, which reported "target not met" on a
      // file that was under the target all along — the default `original`
      // output plus a target is the most likely path, so it lied often.
      metTarget: budgetRequested(targetBytes) ? file.size <= (targetBytes as number) : undefined
    };
  }

  return {
    blob: manualCandidate.blob,
    format: manualCandidate.format,
    qualityScore: 1,
    strategyUsed: manualCandidate.strategyUsed,
    metTarget: manualCandidate.metTarget,
    budgetAttempts: manualCandidate.budgetAttempts
  };
}

export function selectAutomatic(
  evaluated: Selection[],
  threshold: number,
  targetBytes: number | null
): Selection {
  const selected = chooseCandidate(evaluated, threshold);
  if (!selected) {
    throw new Error('No valid compression candidate was produced.');
  }

  const entry = evaluated.find((item) => item.blob === selected.blob);
  return {
    blob: selected.blob,
    format: selected.format,
    qualityScore: selected.qualityScore,
    strategyUsed: selected.strategyUsed,
    metTarget: budgetRequested(targetBytes)
      ? (entry?.metTarget ?? selected.blob.size <= (targetBytes as number))
      : undefined,
    budgetAttempts: entry?.budgetAttempts
  };
}
