import { analyzeRasterProfile } from './analysis/imageProfile';
import { estimateQualityScore } from './analysis/quality';
import {
  compressRaster,
  compressRasterWithinBudget,
  convertSvgToRasterBlob
} from './codecs/raster';
import { optimizeSvgBlob } from './codecs/svg';
import { scanMetadata, stripPrivacyMetadata, type MetadataFindings } from './metadata/metadata';
import { blobMatchesFormat } from '../export/formats';
import { buildCandidates, getQualityThreshold } from './selection/strategy';
import { chooseCandidate } from './selection/choose';
import type {
  ImageProfile,
  QualityScore,
  WorkerCompressionRequest,
  WorkerCompressionResponse
} from './types';

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

interface CandidateOutput {
  blob: Blob;
  metTarget?: boolean;
  budgetAttempts?: number;
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
  progressSpan: number,
  targetBytes: number | null
): Promise<CandidateOutput> {
  if (targetFormat === 'image/svg+xml') {
    const blob = await optimizeSvgBlob(file, mode);
    return { blob };
  }

  if (originalType === 'image/svg+xml') {
    const blob = await convertSvgToRasterBlob(file, targetFormat, scale, quality);
    return { blob };
  }

  if (typeof targetBytes === 'number' && targetBytes > 0) {
    const budgeted = await compressRasterWithinBudget(file, {
      targetFormat,
      scale,
      quality,
      targetBytes
    });
    return {
      blob: budgeted.blob,
      metTarget: budgeted.metTarget,
      budgetAttempts: budgeted.attempts
    };
  }

  const blob = await compressRaster(file, {
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
  return { blob };
}

async function readFindings(blob: Blob): Promise<MetadataFindings | null> {
  try {
    const scan = scanMetadata(new Uint8Array(await blob.arrayBuffer()));
    return scan.format === 'unknown' ? null : scan.findings;
  } catch {
    return null;
  }
}

interface FinalizedArtifact {
  blob: Blob;
  exifKeptForOrientation: boolean;
  artifactFindings: MetadataFindings | null;
}

/**
 * Applies the metadata policy to whichever artifact was chosen: privacy out
 * (EXIF/XMP/text/comments), ICC and a real EXIF orientation in.
 *
 * It runs on every raster artifact, so the guarantee does not depend on which
 * path produced it — the re-encode path is already clean, and the
 * retained-original path is the one that would otherwise keep everything.
 */
async function finalizeArtifact(blob: Blob): Promise<FinalizedArtifact> {
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const scan = scanMetadata(bytes);
    if (scan.format === 'unknown') {
      return { blob, exifKeptForOrientation: false, artifactFindings: null };
    }

    const strip = stripPrivacyMetadata(bytes);
    if (strip.removed === 0) {
      return {
        blob,
        exifKeptForOrientation: strip.exifKeptForOrientation,
        artifactFindings: scan.findings
      };
    }

    return {
      blob: new Blob([strip.bytes.slice()], { type: blob.type }),
      exifKeptForOrientation: strip.exifKeptForOrientation,
      artifactFindings: scanMetadata(strip.bytes).findings
    };
  } catch {
    return { blob, exifKeptForOrientation: false, artifactFindings: null };
  }
}

interface Selection {
  blob: Blob;
  format: string;
  qualityScore: QualityScore;
  strategyUsed: string;
  metTarget?: boolean;
  budgetAttempts?: number;
}

function selectManual(
  manualCandidate: Selection,
  outputFormat: WorkerCompressionRequest['outputFormat'],
  originalType: string,
  file: File,
  mode: WorkerCompressionRequest['mode'],
  budgetRequested: boolean
): Selection {
  const keepOriginal = outputFormat === 'original' && manualCandidate.blob.size >= file.size;
  if (keepOriginal) {
    return {
      blob: file,
      format: originalType,
      qualityScore: 1,
      strategyUsed: `manual-original-retained-${mode}`,
      metTarget: budgetRequested ? false : undefined
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

function selectAutomatic(
  evaluated: Selection[],
  threshold: number,
  budgetRequested: boolean,
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
    metTarget: budgetRequested
      ? (entry?.metTarget ?? selected.blob.size <= (targetBytes as number))
      : undefined,
    budgetAttempts: entry?.budgetAttempts
  };
}

self.onmessage = async (event: MessageEvent<WorkerCompressionRequest>) => {
  const payload = event.data;

  try {
    const { file, id, type, quality, scale, outputFormat, mode, profileHint, targetBytes } =
      payload;
    const budgetRequested = typeof targetBytes === 'number' && targetBytes > 0;
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
    const sourceFindings = type === 'image/svg+xml' ? null : await readFindings(file);
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
      qualityScore: QualityScore;
      strategyUsed: string;
      metTarget?: boolean;
      budgetAttempts?: number;
    }> = [];
    let lastCandidateError: unknown = null;

    for (const [index, candidate] of candidates.entries()) {
      try {
        const progressBase = 18 + Math.round((index / Math.max(1, candidates.length)) * 58);
        const progressSpan = Math.max(12, Math.round(58 / Math.max(1, candidates.length)));
        const output = await runCandidate(
          file,
          id,
          type,
          candidate.format,
          mode,
          quality,
          scale,
          profile,
          progressBase,
          progressSpan,
          targetBytes ?? null
        );
        self.postMessage({
          version: 1,
          id,
          kind: 'progress',
          success: true,
          progress: Math.min(94, progressBase + progressSpan),
          stage: isAutomaticSelection ? 'evaluating' : 'encoding-manual'
        } satisfies WorkerCompressionResponse);
        if (!(await blobMatchesFormat(output.blob, candidate.format))) {
          throw new Error(`Encoded blob does not match requested format: ${candidate.format}`);
        }

        const qualityScore = isAutomaticSelection
          ? await estimateQualityScore(originalReference, output.blob)
          : 1;

        evaluated.push({
          blob: output.blob,
          format: candidate.format,
          qualityScore,
          strategyUsed: candidate.strategyUsed,
          metTarget: output.metTarget,
          budgetAttempts: output.budgetAttempts
        });
      } catch (error) {
        lastCandidateError = error;
        // Ignore unsupported/failed candidate and continue.
      }
    }

    if (isAutomaticSelection && (await blobMatchesFormat(file, type))) {
      evaluated.push({
        blob: file,
        format: type,
        qualityScore: 1,
        strategyUsed: `auto-original-fallback-${profile.kind}-${mode}`,
        // The untouched original only meets a budget if it already fits.
        metTarget: budgetRequested ? file.size <= (targetBytes as number) : undefined
      });
    }

    if (evaluated.length === 0) {
      if (lastCandidateError instanceof Error) {
        throw lastCandidateError;
      }
      throw new Error('No valid compression candidate was produced.');
    }

    const selection = isAutomaticSelection
      ? selectAutomatic(evaluated, threshold, budgetRequested, targetBytes ?? null)
      : selectManual(evaluated[0], outputFormat, type, file, mode, budgetRequested);

    self.postMessage({
      version: 1,
      id,
      kind: 'progress',
      success: true,
      progress: 97,
      stage: 'finalizing'
    } satisfies WorkerCompressionResponse);

    const finalized = await finalizeArtifact(selection.blob);
    const artifactClean = finalized.artifactFindings
      ? !(
          finalized.artifactFindings.exif ||
          finalized.artifactFindings.xmp ||
          finalized.artifactFindings.text
        )
      : true;

    self.postMessage({
      version: 1,
      id,
      kind: 'result',
      success: true,
      blob: finalized.blob,
      originalSize: file.size,
      newSize: finalized.blob.size,
      chosenFormat: selection.format,
      qualityScore: selection.qualityScore,
      bytesSaved: Math.max(0, file.size - finalized.blob.size),
      strategyUsed: selection.strategyUsed,
      metTarget: selection.metTarget,
      budgetAttempts: selection.budgetAttempts,
      metadata: sourceFindings
        ? {
            source: sourceFindings,
            clean: artifactClean,
            exifKeptForOrientation: finalized.exifKeptForOrientation
          }
        : undefined
    } satisfies WorkerCompressionResponse);
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
