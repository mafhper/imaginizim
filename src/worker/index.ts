import { legacySettingsToOutputs } from '../domain/adapters';
import { realCodecs } from './job/bindCodecs';
import { runJob } from './job/runJob';
import type {
  WorkerCompressionRequest,
  WorkerCompressionResponse,
  WorkerJobRequest,
  WorkerJobResponse
} from './types';

type WorkerRequest = WorkerCompressionRequest | WorkerJobRequest;

/**
 * v1 — the live single-output path.
 *
 * It is now an **adapter over the multi-output engine**: the legacy settings
 * become one `OutputSpec`, the job runs, and the single artifact is mapped back
 * to the v1 response. Same behaviour, one engine.
 */
async function handleCompression(payload: WorkerCompressionRequest): Promise<void> {
  const { file, id, type, quality, scale, outputFormat, mode, profileHint, targetBytes } = payload;

  const [output] = legacySettingsToOutputs({
    quality,
    scale,
    outputFormat,
    optimizationMode: mode,
    targetBytes
  });

  const { source, artifacts } = await runJob(
    { file, type, outputs: [output], profileHint },
    realCodecs,
    (event) => {
      self.postMessage({
        version: 1,
        id,
        kind: 'progress',
        success: true,
        progress: event.progress,
        stage: event.stage
      } satisfies WorkerCompressionResponse);
    }
  );

  const artifact = artifacts[0];
  if (!artifact || artifact.status !== 'done' || !artifact.blob) {
    throw new Error(artifact?.error ?? 'No valid compression candidate was produced.');
  }

  const newSize = artifact.newSize ?? artifact.blob.size;
  const findings = artifact.metadata?.findings ?? null;
  const clean = findings ? !(findings.exif || findings.xmp || findings.text) : true;

  self.postMessage({
    version: 1,
    id,
    kind: 'result',
    success: true,
    blob: artifact.blob,
    originalSize: file.size,
    newSize,
    chosenFormat: artifact.format,
    qualityScore: artifact.qualityScore,
    bytesSaved: Math.max(0, file.size - newSize),
    strategyUsed: artifact.strategyUsed,
    metTarget: artifact.metTarget,
    budgetAttempts: artifact.budgetAttempts,
    metadata: source.metadata
      ? {
          source: source.metadata,
          clean,
          exifKeptForOrientation: artifact.metadata?.exifKeptForOrientation ?? false
        }
      : undefined,
    svg: source.svg
  } satisfies WorkerCompressionResponse);
}

/** v2 — the multi-output job: one source, many artifacts. */
async function handleJob(payload: WorkerJobRequest): Promise<void> {
  const { jobId, file, type, outputs, profileHint } = payload;

  const { source, artifacts } = await runJob(
    { file, type, outputs, profileHint },
    realCodecs,
    (event) => {
      self.postMessage({
        version: 2,
        jobId,
        kind: 'progress',
        progress: event.progress,
        stage: event.stage,
        artifactId: event.artifactId
      } satisfies WorkerJobResponse);
    }
  );

  self.postMessage({
    version: 2,
    jobId,
    kind: 'result',
    source,
    artifacts
  } satisfies WorkerJobResponse);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const payload = event.data;

  try {
    if (payload.version === 2) {
      await handleJob(payload);
      return;
    }
    await handleCompression(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected worker error.';

    if (payload.version === 2) {
      self.postMessage({
        version: 2,
        jobId: payload.jobId,
        kind: 'result',
        error: message
      } satisfies WorkerJobResponse);
      return;
    }

    self.postMessage({
      version: 1,
      id: payload.id,
      kind: 'result',
      success: false,
      error: message
    } satisfies WorkerCompressionResponse);
  }
};
