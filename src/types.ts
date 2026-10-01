/**
 * UI-side types. The worker protocol lives in `src/worker/types.ts` and is
 * re-exported here, so the UI and the worker can never drift apart silently.
 */
export type {
  CompressionCandidate,
  ImageKind,
  ImageProfile,
  OptimizationMode,
  OutputFormat,
  QualityScore,
  RasterCompressionOptions,
  WorkerCompressionRequest,
  WorkerCompressionResponse
} from './worker/types';

import type { QualityScore } from './worker/types';

export type FileStatus = 'queued' | 'processing' | 'done' | 'error';
export type PreviewMode = 'split' | 'overlay';
export type QueueDensity = 'comfort' | 'compact';

export interface ProcessedFileRecord {
  id: string;
  file: File;
  status: FileStatus;
  selected: boolean;
  blob: Blob | null;
  originalSize: number;
  newSize: number | null;
  chosenFormat: string;
  /** `null` until a score is measured, and forever when it cannot be. */
  qualityScore: QualityScore;
  strategyUsed: string;
  sourceObjectUrl: string;
  optimizedObjectUrl: string | null;
}
