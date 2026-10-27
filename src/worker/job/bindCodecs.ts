import { analyzeRasterProfile } from '../analysis/imageProfile';
import { estimateQualityScore } from '../analysis/quality';
import {
  compressRaster,
  compressRasterToPalettePng,
  compressRasterWithinBudget,
  convertSvgToRasterBlob
} from '../codecs/raster';
import { optimizeSvgBlob } from '../codecs/svg';
import { finalizeArtifact, readFindings } from '../metadata/finalize';
import { analyzeSvg, validateSvg } from '../../domain/svg';
import { blobMatchesFormat } from '../../export/formats';
import { buildCandidates, getQualityThreshold } from '../selection/strategy';
import { BUDGET_DEFAULTS, encodeWithinBudget } from '../selection/budget';
import { selectAutomatic, selectManual, type Selection } from '../selection/select';
import type { ImageProfile, OptimizationMode, QualityScore } from '../types';
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
  /** Measured fidelity, when the codec already measured it. Saves a second decode. */
  qualityScore?: QualityScore;
  /** Appended to the candidate's strategy label when the codec picked a sub-path. */
  strategySuffix?: string;
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

  if (targetFormat === 'image/png') {
    return runPngCandidate(
      file,
      targetFormat,
      mode,
      quality,
      scale,
      profile,
      targetBytes,
      onProgress
    );
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

function paletteStrategy(palette: { paletteSize: number; dithered: boolean }): string {
  return `+png-palette-${palette.paletteSize}${palette.dithered ? '-dither' : ''}`;
}

/**
 * PNG runs **two** candidates and keeps the better one.
 *
 * `convertToBlob({ type: 'image/png' })` is lossless and ignores `quality`, so
 * the only lever PNG had was the size scale. The palette encoder adds a real
 * one — and the two are compared rather than substituted, so nothing regresses
 * when quantization cannot win (a palette that failed the fidelity floor simply
 * does not exist, and the canvas bytes are returned untouched).
 *
 * With a byte ceiling the comparison changes shape. `convertToBlob` ignores PNG
 * quality — measured in Chromium, `readme-home-preview.png` produced **818 107**
 * bytes at q=0.9, q=0.5 *and* q=0.1, and `og-image.png` **228 352** the same way —
 * so a ladder built on it spends N identical encodes and reports `metTarget:
 * false` while a much smaller output exists. The ladder is therefore **not**
 * applied to the canvas encoder: the palette is walked by palette size, first
 * fit wins, and only if nothing fits does the ladder run on `compressRaster`
 * (UPNG), which *does* answer to quality (same two images: 437 774 → 317 184 and
 * 132 256 → 78 740 from q=0.9 down to q=0.1). The canvas ladder survives as the
 * last resort, for formats the UPNG path refuses.
 */
async function runPngCandidate(
  file: File,
  targetFormat: string,
  mode: OptimizationMode,
  quality: number,
  scale: number,
  profile: ImageProfile,
  targetBytes: number | null,
  onProgress?: (value: number) => void
): Promise<CandidateOutput> {
  const hasBudget = typeof targetBytes === 'number' && targetBytes > 0;

  let palette: Awaited<ReturnType<typeof compressRasterToPalettePng>> = null;
  try {
    palette = await compressRasterToPalettePng(file, {
      scale,
      profileKind: profile.kind,
      targetBytes: hasBudget ? targetBytes : null,
      // The profile already measured the source; handing it over lets the budget
      // gate answer before the file is decoded.
      width: profile.width,
      height: profile.height
    });
  } catch (error) {
    // The palette path is optional by contract: a bug there must degrade to the
    // lossless encoder, never fail the artifact.
    console.warn('Palette PNG candidate failed; falling back to the canvas encoder.', error);
  }

  if (hasBudget) {
    if (palette) {
      return {
        blob: new Blob([palette.bytes.slice()], { type: 'image/png' }),
        metTarget: true,
        budgetAttempts: palette.attempts,
        qualityScore: palette.score,
        strategySuffix: paletteStrategy(palette)
      };
    }

    // Last resort before giving up on the ceiling: the palette could not honour
    // it, so step the quality down on the encoder that actually spends it.
    try {
      const outcome = await encodeWithinBudget(
        (stepQuality) =>
          compressRaster(file, {
            targetFormat,
            scale,
            quality: stepQuality,
            mode,
            profile,
            onProgress
          }),
        {
          targetBytes: targetBytes as number,
          startQuality: quality,
          minQuality: BUDGET_DEFAULTS.minQuality,
          qualityStep: BUDGET_DEFAULTS.qualityStep,
          maxAttempts: BUDGET_DEFAULTS.maxAttempts
        }
      );

      return {
        blob: outcome.blob,
        metTarget: outcome.metTarget,
        budgetAttempts: outcome.attempts
      };
    } catch (error) {
      // `compressRaster` refuses formats it cannot serve; the canvas ladder then
      // keeps the pre-existing behaviour instead of failing the artifact.
      console.warn('UPNG budget ladder failed; falling back to the canvas ladder.', error);
    }

    const budgeted = await compressRasterWithinBudget(file, {
      targetFormat,
      scale,
      quality,
      targetBytes: targetBytes as number
    });
    return {
      blob: budgeted.blob,
      metTarget: budgeted.metTarget,
      budgetAttempts: budgeted.attempts
    };
  }

  const canvasBlob = await compressRaster(file, {
    targetFormat,
    scale,
    quality,
    mode,
    profile,
    onProgress
  });

  if (palette && palette.bytes.length < canvasBlob.size) {
    return {
      blob: new Blob([palette.bytes.slice()], { type: 'image/png' }),
      qualityScore: palette.score,
      strategySuffix: paletteStrategy(palette)
    };
  }

  return { blob: canvasBlob };
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
          ? (result.qualityScore ?? (await estimateQualityScore(originalReference, result.blob)))
          : 1;

        evaluated.push({
          blob: result.blob,
          format: candidate.format,
          qualityScore,
          strategyUsed: result.strategySuffix
            ? `${candidate.strategyUsed}${result.strategySuffix}`
            : candidate.strategyUsed,
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
