import type { ImageProfile, QualityScore } from '../types';
import type { OutputSpec } from '../../domain/types';
import type { MetadataFindings } from '../metadata/metadata';
import type { FinalizedArtifact } from '../metadata/finalize';
import type { SvgAnalysis } from '../../domain/svg';

/**
 * The seam between the multi-output engine and the codecs.
 *
 * `runJob` is pure orchestration: it decides the order, counts the analysis
 * once, validates each artifact and assigns status. Everything that touches a
 * canvas, SVGO or the file system lives behind this interface, so the engine is
 * testable with fakes — and so it can run in a browser, on the desktop or in a
 * test without changing.
 */

export interface SourceAnalysis {
  profile: ImageProfile;
  metadata: MetadataFindings | null;
  svg: SvgAnalysis | null;
  originalSize: number;
}

export interface OutputResult {
  blob: Blob;
  format: string;
  qualityScore: QualityScore;
  strategyUsed: string;
  metTarget?: boolean;
  budgetAttempts?: number;
}

export interface JobCodecs {
  /** Runs **once** per job, no matter how many outputs there are. */
  analyzeSource(file: File, type: string, hint?: Partial<ImageProfile>): Promise<SourceAnalysis>;
  encodeOutput(
    file: File,
    type: string,
    output: OutputSpec,
    source: SourceAnalysis,
    onProgress?: (value: number) => void
  ): Promise<OutputResult>;
  validate(blob: Blob, expectedFormat: string): Promise<boolean>;
  finalize(blob: Blob): Promise<FinalizedArtifact>;
}
