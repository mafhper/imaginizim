import { createValidationReport } from '../../domain/validation';
import type { OutputSpec } from '../../domain/types';
import type { ImageProfile, WorkerArtifact, WorkerJobSource } from '../types';
import type { JobCodecs } from './codecs';

export interface JobRequest {
  file: File;
  type: string;
  outputs: OutputSpec[];
  profileHint?: Partial<ImageProfile>;
}

export interface JobProgressEvent {
  artifactId?: string;
  progress: number;
  stage?: 'analyzing' | 'encoding' | 'encoding-manual' | 'evaluating' | 'finalizing';
}

/**
 * The multi-output engine: one source, many artifacts.
 *
 * The source is analysed **once** — that is the whole point of the job model.
 * Each output is encoded, validated and finalized independently: a failure in
 * one artifact is recorded on that artifact and never takes the others down, so
 * a job can honestly report `partial`.
 */
export async function runJob(
  request: JobRequest,
  codecs: JobCodecs,
  onProgress?: (event: JobProgressEvent) => void
): Promise<{ source: WorkerJobSource; artifacts: WorkerArtifact[] }> {
  onProgress?.({ progress: 6, stage: 'analyzing' });
  const source = await codecs.analyzeSource(request.file, request.type, request.profileHint);
  onProgress?.({ progress: 14, stage: 'analyzing' });

  const total = Math.max(1, request.outputs.length);
  const span = Math.round(74 / total);
  const artifacts: WorkerArtifact[] = [];

  for (const [index, output] of request.outputs.entries()) {
    const base = 18 + Math.round((index / total) * 74);
    onProgress?.({ artifactId: output.id, progress: base, stage: 'encoding' });

    try {
      const result = await codecs.encodeOutput(
        request.file,
        request.type,
        output,
        source,
        (value) =>
          onProgress?.({
            artifactId: output.id,
            progress: Math.min(94, base + Math.round((value / 100) * span)),
            stage: 'encoding'
          })
      );
      const formatValid = await codecs.validate(result.blob, result.format);
      const issues = [...(result.validation?.issues ?? [])];
      if (!formatValid) {
        issues.unshift({
          code: 'format-mismatch',
          severity: 'error',
          message: `Encoded blob does not match requested format: ${result.format}`,
          artifactId: output.id
        });
      }
      const validation = createValidationReport(issues);

      if (!validation.ok) {
        artifacts.push({
          id: output.id,
          format: result.format,
          status: 'error',
          validation,
          error: validation.issues[0]?.message ?? 'Artifact failed validation.'
        });
        continue;
      }

      const finalized = await codecs.finalize(result.blob);
      artifacts.push({
        id: output.id,
        format: result.format,
        status: 'done',
        blob: finalized.blob,
        newSize: finalized.blob.size,
        qualityScore: result.qualityScore,
        metTarget: result.metTarget,
        budgetAttempts: result.budgetAttempts,
        strategyUsed: result.strategyUsed,
        validation,
        metadata: {
          findings: finalized.artifactFindings,
          exifKeptForOrientation: finalized.exifKeptForOrientation
        }
      });
      onProgress?.({
        artifactId: output.id,
        progress: Math.min(94, base + span),
        stage: 'finalizing'
      });
    } catch (error) {
      artifacts.push({
        id: output.id,
        format: output.format,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unexpected artifact error.'
      });
    }
  }

  return {
    source: {
      originalSize: source.originalSize,
      metadata: source.metadata ?? undefined,
      svg: source.svg ?? undefined
    },
    artifacts
  };
}
