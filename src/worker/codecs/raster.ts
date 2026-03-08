import imageCompression from 'browser-image-compression';
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
  if (type === 'image/jpeg' || type === 'image/png' || type === 'image/webp') {
    return true;
  }

  if (SUPPORT_CACHE.has(type)) {
    return SUPPORT_CACHE.get(type) as boolean;
  }

  try {
    const canvas = new OffscreenCanvas(2, 2);
    const blob = await canvas.convertToBlob({ type, quality: 0.9 });
    const supported = blob.type === type;
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
