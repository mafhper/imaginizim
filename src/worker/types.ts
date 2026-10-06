/**
 * The worker protocol. This file is the single source of truth for it.
 *
 * The UI side re-exports these from `src/types.ts` rather than repeating them.
 * They used to be declared byte-identically in both places with nothing linking
 * them, which made every contract change a two-file edit that nothing policed.
 */

import type { MetadataFindings } from './metadata/metadata';
import type { ArtifactStatus, OutputSpec, ValidationReport } from '../domain/types';
import type { SvgAnalysis } from '../domain/svg';

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
  /**
   * Optional byte budget. When set (and > 0), the raster output must fit in
   * this many bytes if the ladder can reach it without going below the quality
   * floor. `null`/absent means "no budget" — the mode-based ceiling applies.
   */
  targetBytes?: number | null;
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
  /**
   * Whether the selected artifact met the request's byte budget. Absent when no
   * budget was asked for; `false` means the budget could not be met.
   */
  metTarget?: boolean;
  /** How many ladder encodes the selected candidate needed. */
  budgetAttempts?: number;
  /**
   * Metadata report: what the original carried (`source`) and whether the
   * delivered artifact is clean. `clean: false` with `exifKeptForOrientation`
   * means EXIF was kept on purpose to preserve the orientation.
   */
  metadata?: WorkerMetadataReport;
  /** Present for SVG sources: the structural analysis of the file. */
  svg?: SvgAnalysis;
  error?: string;
}

export interface WorkerMetadataReport {
  source: MetadataFindings;
  clean: boolean;
  exifKeptForOrientation: boolean;
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
  /** Optional byte budget, forwarded to the budgeted codec path. */
  targetBytes?: number | null;
}

// --- WorkerJob v2: one source, many artifacts --------------------------------

export interface WorkerArtifact {
  /** The `OutputSpec.id` this artifact was produced for. */
  id: string;
  format: string;
  status: ArtifactStatus;
  blob?: Blob;
  newSize?: number;
  qualityScore?: QualityScore;
  metTarget?: boolean;
  budgetAttempts?: number;
  strategyUsed?: string;
  validation?: ValidationReport;
  /** Metadata policy outcome for this artifact (findings after the strip). */
  metadata?: { findings: MetadataFindings | null; exifKeptForOrientation: boolean };
  error?: string;
}

export interface WorkerJobSource {
  originalSize: number;
  metadata?: MetadataFindings;
  svg?: SvgAnalysis;
}

export interface WorkerJobRequest {
  version: 2;
  kind: 'job';
  jobId: string;
  file: File;
  type: string;
  outputs: OutputSpec[];
  profileHint?: Partial<ImageProfile>;
}

export interface WorkerJobResponse {
  version: 2;
  jobId: string;
  kind: 'progress' | 'result';
  progress?: number;
  stage?: 'analyzing' | 'encoding' | 'encoding-manual' | 'evaluating' | 'finalizing';
  /** Which artifact the progress refers to. */
  artifactId?: string;
  source?: WorkerJobSource;
  artifacts?: WorkerArtifact[];
  error?: string;
}
