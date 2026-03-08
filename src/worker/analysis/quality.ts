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

export async function estimateQualityScore(original: Blob, candidate: Blob): Promise<number> {
  const [sampleA, sampleB] = await Promise.all([blobToSample(original), blobToSample(candidate)]);

  if (!sampleA || !sampleB || sampleA.length !== sampleB.length) {
    return 0.88;
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
    return 0.88;
  }

  const rmse = Math.sqrt(mse / pixels);
  return clamp(1 - rmse / 255, 0, 1);
}
