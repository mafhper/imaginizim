import { analyzeRasterProfile } from './analysis/imageProfile';
import { estimateQualityScore } from './analysis/quality';
import { compressRaster, convertSvgToRasterBlob } from './codecs/raster';
import { optimizeSvgBlob } from './codecs/svg';
import { buildCandidates, getQualityThreshold } from './selection/strategy';
import type { ImageProfile, WorkerCompressionRequest, WorkerCompressionResponse } from './types';

function createVectorProfile(): ImageProfile {
  return {
    kind: 'vector',
    width: 0,
    height: 0,
    hasAlpha: true,
    complexity: 0.12
  };
}

function withHint(profile: ImageProfile, hint?: Partial<ImageProfile>): ImageProfile {
  if (!hint) return profile;

  return {
    kind: hint.kind ?? profile.kind,
    width: hint.width ?? profile.width,
    height: hint.height ?? profile.height,
    hasAlpha: hint.hasAlpha ?? profile.hasAlpha,
    complexity: hint.complexity ?? profile.complexity
  };
}

async function runCandidate(
  file: File,
  requestId: string,
  originalType: string,
  targetFormat: string,
  mode: WorkerCompressionRequest['mode'],
  quality: number,
  scale: number,
  profile: ImageProfile,
  progressBase: number,
  progressSpan: number
): Promise<Blob> {
  if (targetFormat === 'image/svg+xml') {
    return optimizeSvgBlob(file, mode);
  }

  if (originalType === 'image/svg+xml') {
    return convertSvgToRasterBlob(file, targetFormat, scale, quality);
  }

  return compressRaster(file, {
    targetFormat,
    scale,
    quality,
    mode,
    profile,
    onProgress: (value) => {
      self.postMessage({
        version: 1,
        id: requestId,
        kind: 'progress',
        success: true,
        progress: Math.min(92, Math.round(progressBase + (value / 100) * progressSpan)),
        stage: 'encoding'
      } satisfies WorkerCompressionResponse);
    }
  });
}

self.onmessage = async (event: MessageEvent<WorkerCompressionRequest>) => {
  const payload = event.data;

  try {
    const { file, id, type, quality, scale, outputFormat, mode, profileHint } = payload;
    const isAutomaticSelection = outputFormat === 'auto';
    self.postMessage({
      version: 1,
      id,
      kind: 'progress',
      success: true,
      progress: 6,
      stage: 'analyzing'
    } satisfies WorkerCompressionResponse);

    const baseProfile =
      type === 'image/svg+xml' ? createVectorProfile() : await analyzeRasterProfile(file);
    const profile = withHint(baseProfile, profileHint);
    self.postMessage({
      version: 1,
      id,
      kind: 'progress',
      success: true,
      progress: 14,
      stage: 'analyzing'
    } satisfies WorkerCompressionResponse);

    const candidates = buildCandidates(type, outputFormat, profile, mode);
    const threshold = getQualityThreshold(mode, profile.kind);
    self.postMessage({
      version: 1,
      id,
      kind: 'progress',
      success: true,
      progress: 18,
      stage: 'analyzing'
    } satisfies WorkerCompressionResponse);

    const originalReference =
      isAutomaticSelection && type === 'image/svg+xml' ? await optimizeSvgBlob(file, mode) : file;

    const evaluated: Array<{
      blob: Blob;
      format: string;
      qualityScore: number;
      strategyUsed: string;
    }> = [];

    for (const [index, candidate] of candidates.entries()) {
      try {
        const progressBase = 18 + Math.round((index / Math.max(1, candidates.length)) * 58);
        const progressSpan = Math.max(12, Math.round(58 / Math.max(1, candidates.length)));
        const blob = await runCandidate(
          file,
          id,
          type,
          candidate.format,
          mode,
          quality,
          scale,
          profile,
          progressBase,
          progressSpan
        );
        self.postMessage({
          version: 1,
          id,
          kind: 'progress',
          success: true,
          progress: Math.min(94, progressBase + progressSpan),
          stage: isAutomaticSelection ? 'evaluating' : 'encoding-manual'
        } satisfies WorkerCompressionResponse);
        const qualityScore = isAutomaticSelection
          ? await estimateQualityScore(originalReference, blob)
          : 1;

        evaluated.push({
          blob,
          format: candidate.format,
          qualityScore,
          strategyUsed: candidate.strategyUsed
        });
      } catch {
        // Ignore unsupported/failed candidate and continue.
      }
    }

    if (isAutomaticSelection) {
      evaluated.push({
        blob: file,
        format: type,
        qualityScore: 1,
        strategyUsed: `auto-original-fallback-${profile.kind}-${mode}`
      });
    }

    if (evaluated.length === 0) {
      throw new Error('No valid compression candidate was produced.');
    }

    if (!isAutomaticSelection) {
      const manualCandidate = evaluated[0];
      const keepOriginal = outputFormat === 'original' && manualCandidate.blob.size >= file.size;
      const selectedBlob = keepOriginal ? file : manualCandidate.blob;
      const selectedFormat = keepOriginal ? type : manualCandidate.format;
      const selectedStrategy = keepOriginal
        ? `manual-original-retained-${mode}`
        : manualCandidate.strategyUsed;

      self.postMessage({
        version: 1,
        id,
        kind: 'progress',
        success: true,
        progress: 97,
        stage: 'finalizing'
      } satisfies WorkerCompressionResponse);

      self.postMessage({
        version: 1,
        id,
        kind: 'result',
        success: true,
        blob: selectedBlob,
        originalSize: file.size,
        newSize: selectedBlob.size,
        chosenFormat: selectedFormat,
        qualityScore: 1,
        bytesSaved: Math.max(0, file.size - selectedBlob.size),
        strategyUsed: selectedStrategy
      } satisfies WorkerCompressionResponse);
      return;
    }

    const viable = evaluated
      .filter((item) => item.qualityScore >= threshold)
      .sort((a, b) => a.blob.size - b.blob.size);

    const fallback = evaluated.sort(
      (a, b) => b.qualityScore - a.qualityScore || a.blob.size - b.blob.size
    )[0];
    const selected = viable[0] ?? fallback;
    self.postMessage({
      version: 1,
      id,
      kind: 'progress',
      success: true,
      progress: 97,
      stage: 'finalizing'
    } satisfies WorkerCompressionResponse);

    const response: WorkerCompressionResponse = {
      version: 1,
      id,
      kind: 'result',
      success: true,
      blob: selected.blob,
      originalSize: file.size,
      newSize: selected.blob.size,
      chosenFormat: selected.format,
      qualityScore: selected.qualityScore,
      bytesSaved: Math.max(0, file.size - selected.blob.size),
      strategyUsed: selected.strategyUsed
    };

    self.postMessage(response);
  } catch (error) {
    const response: WorkerCompressionResponse = {
      version: 1,
      id: payload.id,
      kind: 'result',
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected worker error.'
    };

    self.postMessage(response);
  }
};
