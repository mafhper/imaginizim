import type { ImageKind, ImageProfile } from '../types';

interface ProfileInput {
  hasAlpha: boolean;
  complexity: number;
  flatness: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function classifyProfile({ hasAlpha, complexity, flatness }: ProfileInput): ImageKind {
  if (hasAlpha && complexity < 0.2) {
    return 'transparent-graphic';
  }

  if (!hasAlpha && flatness > 0.72 && complexity < 0.24) {
    return 'ui-screenshot';
  }

  if (complexity < 0.16) {
    return 'graphic';
  }

  return 'photo';
}

function calculateComplexity(data: Uint8ClampedArray, width: number, height: number): number {
  let diffSum = 0;
  let samples = 0;

  const luminance = (index: number) =>
    data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      if (x + 1 < width) {
        const right = idx + 4;
        diffSum += Math.abs(luminance(idx) - luminance(right));
        samples += 1;
      }

      if (y + 1 < height) {
        const bottom = idx + width * 4;
        diffSum += Math.abs(luminance(idx) - luminance(bottom));
        samples += 1;
      }
    }
  }

  if (samples === 0) return 0;
  return clamp(diffSum / samples / 255, 0, 1);
}

function calculateFlatness(data: Uint8ClampedArray, width: number, height: number): number {
  let flatPairs = 0;
  let pairs = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (x + 1 < width) {
        const right = idx + 4;
        const delta =
          Math.abs(r - data[right]) + Math.abs(g - data[right + 1]) + Math.abs(b - data[right + 2]);
        if (delta < 18) flatPairs += 1;
        pairs += 1;
      }

      if (y + 1 < height) {
        const bottom = idx + width * 4;
        const delta =
          Math.abs(r - data[bottom]) +
          Math.abs(g - data[bottom + 1]) +
          Math.abs(b - data[bottom + 2]);
        if (delta < 18) flatPairs += 1;
        pairs += 1;
      }
    }
  }

  if (pairs === 0) return 0;
  return clamp(flatPairs / pairs, 0, 1);
}

function detectAlpha(data: Uint8ClampedArray): boolean {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) {
      return true;
    }
  }

  return false;
}

export async function analyzeRasterProfile(file: Blob): Promise<ImageProfile> {
  const bitmap = await createImageBitmap(file);

  const sampleMax = 96;
  const ratio = bitmap.width / bitmap.height || 1;
  const sampleWidth = Math.max(8, Math.round(ratio >= 1 ? sampleMax : sampleMax * ratio));
  const sampleHeight = Math.max(8, Math.round(ratio >= 1 ? sampleMax / ratio : sampleMax));

  const canvas = new OffscreenCanvas(sampleWidth, sampleHeight);
  const context = canvas.getContext('2d', {
    alpha: true,
    willReadFrequently: true
  });

  if (!context) {
    bitmap.close();
    return {
      kind: 'photo',
      width: bitmap.width,
      height: bitmap.height,
      hasAlpha: false,
      complexity: 0.25
    };
  }

  context.drawImage(bitmap, 0, 0, sampleWidth, sampleHeight);
  const imageData = context.getImageData(0, 0, sampleWidth, sampleHeight);
  bitmap.close();

  const hasAlpha = detectAlpha(imageData.data);
  const complexity = calculateComplexity(imageData.data, sampleWidth, sampleHeight);
  const flatness = calculateFlatness(imageData.data, sampleWidth, sampleHeight);

  return {
    kind: classifyProfile({ hasAlpha, complexity, flatness }),
    width: bitmap.width,
    height: bitmap.height,
    hasAlpha,
    complexity
  };
}
