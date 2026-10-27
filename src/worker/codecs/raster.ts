import imageCompression from 'browser-image-compression';
import { blobMatchesFormat } from '../../export/formats';
import { estimateQualityScore } from '../analysis/quality';
import { encodeWithinBudget, BUDGET_DEFAULTS } from '../selection/budget';
import {
  PALETTE_FIDELITY_FLOOR,
  paletteWithinBudget,
  searchPalettePng,
  type PaletteSearchResult
} from './palettePng';
import type { RasterCompressionOptions } from '../types';

const SUPPORT_CACHE = new Map<string, boolean>();

function modeToQualityMultiplier(mode: RasterCompressionOptions['mode']): number {
  if (mode === 'max-compression') return 0.82;
  if (mode === 'max-speed') return 0.95;
  return 0.9;
}

function profileQualityBoost(profileKind: string, targetFormat: string): number {
  if (profileKind === 'ui-screenshot') {
    if (targetFormat === 'image/webp') return 0.84;
    if (targetFormat === 'image/avif') return 0.78;
    if (targetFormat === 'image/jpeg') return 0.72;
  }
  return 1;
}

function modeToMaxIteration(mode: RasterCompressionOptions['mode']): number {
  if (mode === 'max-compression') return 18;
  if (mode === 'max-speed') return 8;
  return 12;
}

function modeToMaxSize(mode: RasterCompressionOptions['mode'], profileKind: string): number {
  if (profileKind === 'ui-screenshot') {
    if (mode === 'max-compression') return 0.55;
    if (mode === 'max-speed') return 1.2;
    return 0.85;
  }
  if (mode === 'max-compression') return profileKind === 'photo' ? 0.7 : 0.9;
  if (mode === 'max-speed') return profileKind === 'photo' ? 2.5 : 2;
  return profileKind === 'photo' ? 1.5 : 1.8;
}

async function supportsFormat(type: string): Promise<boolean> {
  if (SUPPORT_CACHE.has(type)) {
    return SUPPORT_CACHE.get(type) as boolean;
  }

  try {
    const canvas = new OffscreenCanvas(2, 2);
    const context = canvas.getContext('2d');
    context?.fillRect(0, 0, 2, 2);
    const blob = await canvas.convertToBlob({ type, quality: 0.9 });
    const supported = blob.type === type && (await blobMatchesFormat(blob, type));
    SUPPORT_CACHE.set(type, supported);
    return supported;
  } catch {
    SUPPORT_CACHE.set(type, false);
    return false;
  }
}

export async function convertSvgToRasterBlob(
  file: Blob,
  targetFormat: string,
  scale: number,
  quality: number
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const width = Math.max(1, Math.round(bitmap.width * Math.max(0.2, scale)));
  const height = Math.max(1, Math.round(bitmap.height * Math.max(0.2, scale)));

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { alpha: true });

  if (!context) {
    bitmap.close();
    throw new Error('Unable to render SVG in worker context.');
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.convertToBlob({ type: targetFormat, quality });
}

export async function compressRaster(
  file: Blob,
  {
    targetFormat,
    scale,
    quality,
    mode,
    profile,
    onProgress
  }: RasterCompressionOptions & { onProgress?: (value: number) => void }
): Promise<Blob> {
  if (!(await supportsFormat(targetFormat))) {
    throw new Error(`Format not supported by this browser: ${targetFormat}`);
  }

  const options = {
    maxSizeMB: modeToMaxSize(mode, profile.kind),
    maxWidthOrHeight: undefined as number | undefined,
    useWebWorker: false,
    fileType: targetFormat,
    initialQuality: Math.max(
      0.2,
      Math.min(
        0.98,
        quality * modeToQualityMultiplier(mode) * profileQualityBoost(profile.kind, targetFormat)
      )
    ),
    maxIteration: modeToMaxIteration(mode),
    onProgress
  };

  if (scale !== 1) {
    const bitmap = await createImageBitmap(file);
    options.maxWidthOrHeight = Math.max(
      2,
      Math.round(Math.max(bitmap.width, bitmap.height) * scale)
    );
    bitmap.close();
  }

  return imageCompression(file as File, options);
}

export interface RasterBudgetResult {
  blob: Blob;
  metTarget: boolean;
  attempts: number;
  qualityUsed: number;
}

/**
 * Renders the source once into a canvas — the **master** — so every ladder step
 * re-encodes from the same pixels instead of stacking degradation on top of a
 * previously degraded encode.
 */
async function renderMaster(file: Blob, scale: number): Promise<OffscreenCanvas> {
  const bitmap = await createImageBitmap(file);
  const width = Math.max(1, Math.round(bitmap.width * Math.max(0.2, scale)));
  const height = Math.max(1, Math.round(bitmap.height * Math.max(0.2, scale)));

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { alpha: true });

  if (!context) {
    bitmap.close();
    throw new Error('Unable to render image in worker context.');
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas;
}

/**
 * The palette candidate for PNG: quantize the master's pixels down to an
 * indexed image and keep it only if it reaches the fidelity floor for this kind
 * of image.
 *
 * It renders through `renderMaster` — the same source of pixels the quality
 * ladder re-encodes from — and scores with `estimateQualityScore`, so the
 * decision is measured, not assumed. `null` means "no candidate": no
 * `CompressionStream`, an image above `PALETTE_MAX_PIXELS`, too much soft
 * transparency, or nothing cleared the floor. The lossless canvas PNG is always
 * still there, so `null` is safe, not fatal.
 */
export async function compressRasterToPalettePng(
  file: Blob,
  {
    scale,
    profileKind,
    targetBytes
  }: {
    scale: number;
    profileKind: RasterCompressionOptions['profile']['kind'];
    targetBytes?: number | null;
  }
): Promise<PaletteSearchResult | null> {
  if (typeof CompressionStream === 'undefined') return null;

  const master = await renderMaster(file, scale);
  const context = master.getContext('2d', { alpha: true });

  if (!context) return null;
  // Above the budget there is no candidate to score, so the 12 MP pixel copy is
  // not paid for at all — measured 2026-10-27 at 24 s of pure waste.
  if (!paletteWithinBudget(master.width, master.height)) return null;

  const imageData = context.getImageData(0, 0, master.width, master.height);

  return searchPalettePng(
    imageData.data,
    master.width,
    master.height,
    async (bytes) => estimateQualityScore(file, new Blob([bytes.slice()], { type: 'image/png' })),
    {
      floor: PALETTE_FIDELITY_FLOOR[profileKind],
      targetBytes: targetBytes ?? null
    }
  );
}

/**
 * Encodes a raster artifact that must fit a byte budget.
 *
 * This is the byte contract, not a heuristic: the ladder lowers quality until
 * the encode fits, and reports honestly when it cannot. `metTarget: false`
 * always carries the smallest attempt, so the caller still gets a usable blob.
 */
export async function compressRasterWithinBudget(
  file: Blob,
  {
    targetFormat,
    scale,
    quality,
    targetBytes
  }: Pick<RasterCompressionOptions, 'targetFormat' | 'scale' | 'quality' | 'targetBytes'> & {
    targetBytes: number;
  }
): Promise<RasterBudgetResult> {
  if (!(await supportsFormat(targetFormat))) {
    throw new Error(`Format not supported by this browser: ${targetFormat}`);
  }

  const master = await renderMaster(file, scale);

  const outcome = await encodeWithinBudget(
    (stepQuality) => master.convertToBlob({ type: targetFormat, quality: stepQuality }),
    {
      targetBytes,
      startQuality: quality,
      minQuality: BUDGET_DEFAULTS.minQuality,
      qualityStep: BUDGET_DEFAULTS.qualityStep,
      maxAttempts: BUDGET_DEFAULTS.maxAttempts
    }
  );

  return {
    blob: outcome.blob,
    metTarget: outcome.metTarget,
    attempts: outcome.attempts,
    qualityUsed: outcome.quality
  };
}
