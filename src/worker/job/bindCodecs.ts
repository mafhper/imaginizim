import { analyzeRasterProfile } from '../analysis/imageProfile';
import { estimateQualityScore } from '../analysis/quality';
import {
  compressRaster,
  compressRasterWithinBudget,
  convertSvgToRasterBlob
} from '../codecs/raster';
import { optimizeSvgBlob } from '../codecs/svg';
import { finalizeArtifact, readFindings } from '../metadata/finalize';
import { analyzeSvg, validateSvg } from '../../domain/svg';
import { blobMatchesFormat } from '../../export/formats';
import { buildCandidates, getQualityThreshold } from '../selection/strategy';
import { selectAutomatic, selectManual, type Selection } from '../selection/select';
import type { ImageProfile, OptimizationMode } from '../types';
import type { JobCodecs, OutputResult, SourceAnalysis } from './codecs';

/**
 * The real codecs, bound to the engine. Everything that touches a canvas, SVGO
 * or the metadata parser lives here; `runJob` only orchestrates.
 *
 * This is the code that used to be inline in the worker entry — moved, not
 * rewritten, so the behaviour of the live path is preserved.
 */

interface CandidateOutput {
  blob: Blob;
  metTarget?: boolean;
  budgetAttempts?: number;
}

function createVectorProfile(): ImageProfile {
  return { kind: 'vector', width: 0, height: 0, hasAlpha: true, complexity: 0.12 };
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
  originalType: string,
  targetFormat: string,
  mode: OptimizationMode,
  quality: number,
  scale: number,
  profile: ImageProfile,
  targetBytes: number | null,
  onProgress?: (value: number) => void
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
    onProgress
  });
  return { blob };
}

export const realCodecs: JobCodecs = {
  async analyzeSource(file, type, hint): Promise<SourceAnalysis> {
    const base =
      type === 'image/svg+xml' ? createVectorProfile() : await analyzeRasterProfile(file);
    const profile = withHint(base, hint);
    const metadata = type === 'image/svg+xml' ? null : await readFindings(file);
    const svg = type === 'image/svg+xml' ? analyzeSvg(await file.text()) : null;

    return { profile, metadata, svg, originalSize: file.size };
  },

  async encodeOutput(file, type, output, source, onProgress): Promise<OutputResult> {
    const mode = output.optimizationMode ?? 'balanced';
    const quality = output.quality ?? 0.78;
    const scale = output.scale ?? 1;
    const targetBytes = output.targetBytes ?? null;
    const budgetRequested = typeof targetBytes === 'number' && targetBytes > 0;
    const isAutomatic = output.format === 'auto';

    const candidates = buildCandidates(type, output.format, source.profile, mode);
    const threshold = getQualityThreshold(mode, source.profile.kind);
    const originalReference =
      isAutomatic && type === 'image/svg+xml' ? await optimizeSvgBlob(file, mode) : file;

    const evaluated: Selection[] = [];
    let lastCandidateError: unknown = null;

    for (const candidate of candidates) {
      try {
        const result = await runCandidate(
          file,
          type,
          candidate.format,
          mode,
          quality,
          scale,
          source.profile,
          targetBytes,
          onProgress
        );
        if (!(await blobMatchesFormat(result.blob, candidate.format))) {
          throw new Error(`Encoded blob does not match requested format: ${candidate.format}`);
        }
        const qualityScore = isAutomatic
          ? await estimateQualityScore(originalReference, result.blob)
          : 1;

        evaluated.push({
          blob: result.blob,
          format: candidate.format,
          qualityScore,
          strategyUsed: candidate.strategyUsed,
          metTarget: result.metTarget,
          budgetAttempts: result.budgetAttempts
        });
      } catch (error) {
        lastCandidateError = error;
        // Ignore unsupported/failed candidate and continue.
      }
    }

    if (isAutomatic && (await blobMatchesFormat(file, type))) {
      evaluated.push({
        blob: file,
        format: type,
        qualityScore: 1,
        strategyUsed: `auto-original-fallback-${source.profile.kind}-${mode}`,
        metTarget: budgetRequested ? file.size <= (targetBytes as number) : undefined
      });
    }

    if (evaluated.length === 0) {
      if (lastCandidateError instanceof Error) throw lastCandidateError;
      throw new Error('No valid compression candidate was produced.');
    }

    const selection = isAutomatic
      ? selectAutomatic(evaluated, threshold, targetBytes)
      : selectManual(evaluated[0], output.format, type, file, mode, targetBytes);

    // SVG gets a real validation: the optimizer must not break references,
    // drop the viewBox, or introduce a raster/external dependency.
    const validation =
      selection.format === 'image/svg+xml'
        ? validateSvg({
            original: await file.text(),
            optimized: await selection.blob.text(),
            artifactId: output.id
          })
        : undefined;

    return {
      blob: selection.blob,
      format: selection.format,
      qualityScore: selection.qualityScore,
      strategyUsed: selection.strategyUsed,
      metTarget: selection.metTarget,
      budgetAttempts: selection.budgetAttempts,
      validation
    };
  },

  validate: (blob, expectedFormat) => blobMatchesFormat(blob, expectedFormat),
  finalize: (blob) => finalizeArtifact(blob)
};
