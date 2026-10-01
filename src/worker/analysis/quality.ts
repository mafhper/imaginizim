import type { QualityScore } from '../types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

async function blobToSample(blob: Blob): Promise<Uint8ClampedArray | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const size = 40;
    const canvas = new OffscreenCanvas(size, size);
    const context = canvas.getContext('2d', {
      alpha: false,
      willReadFrequently: true
    });

    if (!context) {
      bitmap.close();
      return null;
    }

    context.drawImage(bitmap, 0, 0, size, size);
    bitmap.close();
    return context.getImageData(0, 0, size, size).data;
  } catch {
    return null;
  }
}

/**
 * Estimates similarity between a candidate and its source as `1 - rmse/255`.
 *
 * Returns `null` when the comparison cannot be performed — a blob the worker
 * cannot decode, a missing 2d context, mismatched samples. It used to return a
 * hardcoded `0.88` instead, and because the `balanced` threshold is `0.87`,
 * every one of those failures was scored as a *pass*.
 */
export async function estimateQualityScore(original: Blob, candidate: Blob): Promise<QualityScore> {
  const [sampleA, sampleB] = await Promise.all([blobToSample(original), blobToSample(candidate)]);

  if (!sampleA || !sampleB || sampleA.length !== sampleB.length) {
    return null;
  }

  let mse = 0;
  let pixels = 0;

  for (let i = 0; i < sampleA.length; i += 4) {
    const dr = sampleA[i] - sampleB[i];
    const dg = sampleA[i + 1] - sampleB[i + 1];
    const db = sampleA[i + 2] - sampleB[i + 2];

    mse += dr * dr + dg * dg + db * db;
    pixels += 3;
  }

  if (pixels === 0) {
    return null;
  }

  const rmse = Math.sqrt(mse / pixels);
  return clamp(1 - rmse / 255, 0, 1);
}
