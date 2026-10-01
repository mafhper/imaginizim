/**
 * The worker protocol. This file is the single source of truth for it.
 *
 * The UI side re-exports these from `src/types.ts` rather than repeating them.
 * They used to be declared byte-identically in both places with nothing linking
 * them, which made every contract change a two-file edit that nothing policed.
 */

/**
 * Measured similarity between a candidate and its source, or `null` when it
 * could not be measured.
 *
 * `null` is a real state, not a zero. A failed measurement must never be
 * reported as a score: `null` keeps "we do not know" distinguishable from "we
 * know, and it is bad". The old code returned a hardcoded `0.88` on both
 * failure paths, which sits above the `balanced` threshold of `0.87` — so a
 * scoring failure silently *passed* the quality gate.
 */
export type QualityScore = number | null;

export type OutputFormat =
  'original' | 'auto' | 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif' | 'image/svg+xml';

export type OptimizationMode = 'balanced' | 'max-compression' | 'max-speed';

export type ImageKind = 'photo' | 'graphic' | 'transparent-graphic' | 'ui-screenshot' | 'vector';

export interface ImageProfile {
  kind: ImageKind;
  width: number;
  height: number;
  hasAlpha: boolean;
  complexity: number;
}

export interface WorkerCompressionRequest {
  version: 1;
  id: string;
  file: File;
  type: string;
  quality: number;
  scale: number;
  outputFormat: OutputFormat;
  mode: OptimizationMode;
  profileHint?: Partial<ImageProfile>;
}

export interface WorkerCompressionResponse {
  version: 1;
  id: string;
  kind?: 'progress' | 'result';
  success: boolean;
  progress?: number;
  stage?: 'analyzing' | 'encoding' | 'encoding-manual' | 'evaluating' | 'finalizing';
  blob?: Blob;
  originalSize?: number;
  newSize?: number;
  chosenFormat?: string;
  /** Absent while a candidate is still being encoded. `null` means unmeasurable. */
  qualityScore?: QualityScore;
  bytesSaved?: number;
  strategyUsed?: string;
  error?: string;
}

export interface CompressionCandidate {
  format: string;
  strategyUsed: string;
}

export interface RasterCompressionOptions {
  targetFormat: string;
  scale: number;
  quality: number;
  mode: OptimizationMode;
  profile: ImageProfile;
}
