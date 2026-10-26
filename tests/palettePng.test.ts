import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildNearestLut,
  buildPalette,
  cubeKey,
  cubeRepresentative,
  encodePalettePng,
  mapToIndices,
  quantizeToPalettePng,
  searchPalettePng
} from '../src/worker/codecs/palettePng';

/**
 * The palette quantizer is a pure pipeline: histogram → palette → LUT → indices →
 * PNG bytes. Every seam below is exercised without a canvas, which is why it can
 * live in the `node` project: the only browser API it needs is `CompressionStream`
 * (present in Node 22+), and its absence is a supported state, not an error.
 *
 * Fixtures are generated from a seeded PRNG so the numbers are reproducible; the
 * expected values are literals from the spec, never recomputed from the code.
 */

/** mulberry32 — deterministic, so a failure is always reproducible. */
function prng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noisePixels(width: number, height: number, seed: number): Uint8ClampedArray {
  const random = prng(seed);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.floor(random() * 256);
    data[i + 1] = Math.floor(random() * 256);
    data[i + 2] = Math.floor(random() * 256);
    data[i + 3] = 255;
  }
  return data;
}

function flatPixels(width: number, height: number, colors: number[][]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0, x = 0; i < data.length; i += 4, x += 1) {
    const color = colors[x % colors.length];
    data[i] = color[0];
    data[i + 1] = color[1];
    data[i + 2] = color[2];
    data[i + 3] = 255;
  }
  return data;
}

/** The metric from the spec, written here independently of the module. */
function weightedDistance(r: number, g: number, b: number, color: number[]): number {
  const dr = r - color[0];
  const dg = g - color[1];
  const db = b - color[2];
  return dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildPalette', () => {
  it('never returns more than the requested number of colors', () => {
    const pixels = noisePixels(64, 64, 1);

    const palette = buildPalette(pixels, 16);

    expect(palette.length).toBeLessThanOrEqual(16);
    expect(palette.length).toBeGreaterThan(0);
    for (const color of palette) {
      expect(color).toHaveLength(3);
      for (const channel of color) {
        expect(Number.isInteger(channel)).toBe(true);
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });

  it('returns the exact colors of an image whose palette fits', () => {
    const colors = [
      [17, 34, 51],
      [204, 51, 0],
      [240, 240, 240]
    ];
    const pixels = flatPixels(32, 32, colors);

    const palette = buildPalette(pixels, 8);

    // A palette with one entry per 5-bit bucket gives back these colours as they
    // were — the entries are bucket averages, so the guarantee is a few units per
    // channel, not lossless.
    expect(palette).toHaveLength(3);
    expect(palette.map((color) => color.join(','))).toEqual(
      expect.arrayContaining(['17,34,51', '204,51,0', '240,240,240'])
    );
  });
});

describe('buildNearestLut', () => {
  it('agrees with an exhaustive nearest-colour scan on random colours', () => {
    const palette = buildPalette(noisePixels(48, 48, 7), 24);
    const lut = buildNearestLut(palette);

    expect(lut).toHaveLength(32768);

    const random = prng(99);
    for (let sample = 0; sample < 2000; sample += 1) {
      const r = Math.floor(random() * 256);
      const g = Math.floor(random() * 256);
      const b = Math.floor(random() * 256);
      const key = cubeKey(r, g, b);

      // The LUT is a precomputation: same representative, same metric, same
      // winner — otherwise every dithered pixel would drift.
      const [cr, cg, cb] = cubeRepresentative(key);
      let expected = 0;
      let bestDistance = Infinity;
      for (let i = 0; i < palette.length; i += 1) {
        const distance = weightedDistance(cr, cg, cb, palette[i]);
        if (distance < bestDistance) {
          bestDistance = distance;
          expected = i;
        }
      }

      expect(lut[key]).toBe(expected);
    }
  });
});

function gradientPixels(width: number, height: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      data[i] = Math.round((x / (width - 1)) * 255);
      data[i + 1] = Math.round((y / (height - 1)) * 255);
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  return data;
}

function meanChannel(
  pixels: Uint8ClampedArray,
  indices: Uint8Array,
  palette: number[][],
  channel: number
) {
  let total = 0;
  for (let i = 0; i < indices.length; i += 1) total += palette[indices[i]][channel];
  return total / indices.length;
}

describe('mapToIndices', () => {
  it('is deterministic and never leaves the palette', () => {
    const width = 40;
    const height = 30;
    const pixels = gradientPixels(width, height);
    const palette = buildPalette(pixels, 8);
    const lut = buildNearestLut(palette);

    const first = mapToIndices(pixels, width, height, palette, lut, true);
    const second = mapToIndices(pixels, width, height, palette, lut, true);

    expect(first).toHaveLength(width * height);
    expect(Array.from(first)).toEqual(Array.from(second));
    for (const index of first) {
      expect(index).toBeLessThan(palette.length);
    }
  });

  it('picks the nearest colour pixel by pixel when dithering is off', () => {
    const width = 16;
    const height = 16;
    const pixels = gradientPixels(width, height);
    const palette = buildPalette(pixels, 8);
    const lut = buildNearestLut(palette);

    const indices = mapToIndices(pixels, width, height, palette, lut, false);

    for (let i = 0; i < indices.length; i += 1) {
      const offset = i * 4;
      const expected = lut[cubeKey(pixels[offset], pixels[offset + 1], pixels[offset + 2])];
      expect(indices[i]).toBe(expected);
    }
  });

  it('spreads a flat tone across its neighbours when dithering is on', () => {
    const width = 32;
    const height = 32;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 128;
      pixels[i + 1] = 128;
      pixels[i + 2] = 128;
      pixels[i + 3] = 255;
    }
    const palette = [
      [0, 0, 0],
      [255, 255, 255]
    ];
    const lut = buildNearestLut(palette);

    const dithered = mapToIndices(pixels, width, height, palette, lut, true);
    const plain = mapToIndices(pixels, width, height, palette, lut, false);

    // Floyd–Steinberg is what makes a 2-colour palette land on mid grey: the
    // plain path can only pick one of the two, the dithered path averages there.
    expect(Math.abs(meanChannel(pixels, dithered, palette, 0) - 128)).toBeLessThanOrEqual(8);
    expect(Math.abs(meanChannel(pixels, plain, palette, 0) - 128)).toBeGreaterThan(100);
  });
});

interface Chunk {
  type: string;
  data: Uint8Array;
  crc: number;
  crcOverTypeAndData: number;
}

/** Independent CRC32: bit-by-bit, straight from the PNG specification. */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function readChunks(png: Uint8Array): Chunk[] {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const chunks: Chunk[] = [];
  let offset = 8;

  while (offset + 12 <= png.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...png.slice(offset + 4, offset + 8));
    const data = png.slice(offset + 8, offset + 8 + length);
    const crc = view.getUint32(offset + 8 + length);
    chunks.push({
      type,
      data,
      crc,
      crcOverTypeAndData: crc32(png.slice(offset + 4, offset + 8 + length))
    });
    offset += 12 + length;
  }

  return chunks;
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes.slice()]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

describe('encodePalettePng', () => {
  it('writes a decodable indexed PNG with correct headers and CRCs', async () => {
    const width = 7;
    const height = 5;
    const palette = [
      [10, 20, 30],
      [200, 100, 50],
      [255, 255, 255]
    ];
    const indices = new Uint8Array(width * height);
    for (let i = 0; i < indices.length; i += 1) indices[i] = i % palette.length;

    const bytes = await encodePalettePng({ palette, indices, width, height, transparentIndex: -1 });

    expect(bytes).not.toBeNull();
    const png = bytes as Uint8Array;

    // PNG signature, byte for byte.
    expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);

    const chunks = readChunks(png);
    expect(chunks.map((chunk) => chunk.type)).toEqual(['IHDR', 'PLTE', 'IDAT', 'IEND']);
    for (const chunk of chunks) {
      expect(chunk.crc).toBe(chunk.crcOverTypeAndData);
    }

    const header = new DataView(chunks[0].data.buffer, chunks[0].data.byteOffset, 13);
    expect(header.getUint32(0)).toBe(width);
    expect(header.getUint32(4)).toBe(height);
    expect(chunks[0].data[8]).toBe(8); // bit depth
    expect(chunks[0].data[9]).toBe(3); // colour type: indexed
    expect(chunks[0].data[10]).toBe(0); // deflate
    expect(chunks[0].data[11]).toBe(0); // adaptive filtering
    expect(chunks[0].data[12]).toBe(0); // no interlace

    expect(chunks[1].data).toHaveLength(palette.length * 3);
    expect(Array.from(chunks[1].data.slice(0, 3))).toEqual([10, 20, 30]);

    // Every row carries its filter byte, so the raw stream is exactly
    // `(width + 1) * height` bytes. This is what a strict decoder requires.
    const raw = await inflate(chunks[2].data);
    expect(raw).toHaveLength((width + 1) * height);
    for (let y = 0; y < height; y += 1) {
      expect(raw[y * (width + 1)]).toBeGreaterThanOrEqual(0);
      expect(raw[y * (width + 1)]).toBeLessThanOrEqual(4);
    }
  });

  it('returns null when the platform has no CompressionStream', async () => {
    vi.stubGlobal('CompressionStream', undefined);

    const bytes = await encodePalettePng({
      palette: [[0, 0, 0]],
      indices: new Uint8Array(4),
      width: 2,
      height: 2,
      transparentIndex: -1
    });

    expect(bytes).toBeNull();
  });
});

describe('quantizeToPalettePng', () => {
  it('refuses an image with more than 2% of semi-transparent pixels', async () => {
    const width = 32;
    const height = 32;
    const pixels = gradientPixels(width, height);
    // 30 of 1024 pixels (2.93%) sit between the transparent and opaque bands.
    for (let i = 0; i < 30; i += 1) pixels[i * 4 + 3] = 128;

    const result = await quantizeToPalettePng(pixels, width, height, { maxColors: 64 });

    expect(result).toBeNull();
  });

  it('binarizes a tolerated amount of semi-transparency', async () => {
    const width = 32;
    const height = 32;
    const pixels = gradientPixels(width, height);
    // 20 of 1024 (1.95%) — under the limit, so the candidate still exists.
    for (let i = 0; i < 20; i += 1) pixels[i * 4 + 3] = 128;

    const result = await quantizeToPalettePng(pixels, width, height, { maxColors: 64 });

    expect(result).not.toBeNull();
  });

  it('reserves a palette entry and emits tRNS for binary transparency', async () => {
    const width = 8;
    const height = 8;
    const pixels = flatPixels(width, height, [[12, 34, 56]]);
    for (let i = 0; i < 32; i += 1) pixels[i * 4 + 3] = 0;

    const result = await quantizeToPalettePng(pixels, width, height, { maxColors: 16 });
    expect(result).not.toBeNull();

    const chunks = readChunks((result as { bytes: Uint8Array }).bytes);
    const trns = chunks.find((chunk) => chunk.type === 'tRNS');
    const plte = chunks.find((chunk) => chunk.type === 'PLTE');

    expect(plte?.data).toHaveLength((result as { paletteSize: number }).paletteSize * 3);
    expect(trns).toBeDefined();
    // One transparent entry, everything declared before it stays opaque.
    expect(trns?.data).toHaveLength((result as { paletteSize: number }).paletteSize);
    expect(trns?.data[trns.data.length - 1]).toBe(0);
    expect(Array.from(trns?.data.slice(0, -1) ?? []).every((value) => value === 255)).toBe(true);
  });

  it('sends no tRNS for an opaque image', async () => {
    const pixels = gradientPixels(16, 16);

    const result = await quantizeToPalettePng(pixels, 16, 16, { maxColors: 32 });
    expect(result).not.toBeNull();

    const chunks = readChunks((result as { bytes: Uint8Array }).bytes);
    expect(chunks.some((chunk) => chunk.type === 'tRNS')).toBe(false);
  });

  it('does not dither an image whose colours fit the palette, and does otherwise', async () => {
    const exact = flatPixels(16, 16, [
      [0, 0, 0],
      [255, 255, 255],
      [200, 10, 10]
    ]);
    const exactResult = await quantizeToPalettePng(exact, 16, 16, { maxColors: 16 });
    expect(exactResult?.dithered).toBe(false);

    const rich = gradientPixels(16, 16);
    const richResult = await quantizeToPalettePng(rich, 16, 16, { maxColors: 4 });
    expect(richResult?.dithered).toBe(true);
  });
});

function paletteEntriesOf(bytes: Uint8Array): number {
  const plte = readChunks(bytes).find((chunk) => chunk.type === 'PLTE');
  return (plte?.data.length ?? 0) / 3;
}

describe('searchPalettePng', () => {
  it('stops at the first palette that clears the floor', async () => {
    const pixels = gradientPixels(24, 24);
    const seen: number[] = [];

    const result = await searchPalettePng(
      pixels,
      24,
      24,
      async (bytes) => {
        seen.push(paletteEntriesOf(bytes));
        return 1;
      },
      { floor: 0.99 }
    );

    expect(result).not.toBeNull();
    expect(seen).toEqual([16]);
    expect(result?.paletteSize).toBe(16);
    expect(result?.attempts).toBe(1);
    expect(result?.score).toBe(1);
    expect(result?.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('walks the ladder upwards and skips a palette that fails the floor', async () => {
    const pixels = gradientPixels(24, 24);
    const seen: number[] = [];

    const result = await searchPalettePng(
      pixels,
      24,
      24,
      async (bytes) => {
        const entries = paletteEntriesOf(bytes);
        seen.push(entries);
        return entries >= 64 ? 0.995 : 0.9;
      },
      { floor: 0.99 }
    );

    expect(seen).toEqual([16, 32, 64]);
    expect(result?.paletteSize).toBe(64);
    expect(result?.attempts).toBe(3);
  });

  it('honours a byte ceiling without giving up the floor', async () => {
    const pixels = gradientPixels(24, 24);
    const quarter = await quantizeToPalettePng(pixels, 24, 24, { maxColors: 16 });

    const result = await searchPalettePng(
      pixels,
      24,
      24,
      async (bytes) => (paletteEntriesOf(bytes) >= 32 ? 0.995 : 0.99),
      { floor: 0.99, targetBytes: (quarter as { bytes: Uint8Array }).bytes.length }
    );

    expect(result).not.toBeNull();
    // Whatever the ladder found, it fits the contract it was given.
    expect((result as { bytes: Uint8Array }).bytes.length).toBeLessThanOrEqual(
      (quarter as { bytes: Uint8Array }).bytes.length
    );
  });

  it('returns null when the ceiling cannot be met', async () => {
    const result = await searchPalettePng(gradientPixels(16, 16), 16, 16, async () => 1, {
      floor: 0.99,
      targetBytes: 1
    });

    expect(result).toBeNull();
  });

  it('returns null when the score cannot be measured', async () => {
    const result = await searchPalettePng(gradientPixels(16, 16), 16, 16, async () => null, {
      floor: 0.99
    });

    expect(result).toBeNull();
  });

  it('abandons images with too much soft transparency before encoding', async () => {
    const width = 16;
    const height = 16;
    const pixels = gradientPixels(width, height);
    for (let i = 0; i < pixels.length; i += 4) pixels[i + 3] = 100;

    let scored = 0;
    const result = await searchPalettePng(
      pixels,
      width,
      height,
      async () => {
        scored += 1;
        return 1;
      },
      { floor: 0.99 }
    );

    expect(result).toBeNull();
    expect(scored).toBe(0);
  });

  it('tries the exact palette before the ascending sweep', async () => {
    // 20 well-separated colours land in 20 distinct 5-bit buckets, so the
    // smallest quota that can hold them is 32 — and that artifact is lossless.
    const colors: number[][] = [];
    for (let i = 0; i < 20; i += 1) {
      colors.push([(i * 47) % 256, (i * 91) % 256, (i * 13) % 256]);
    }
    const pixels = flatPixels(40, 40, colors);
    const seen: number[] = [];

    const result = await searchPalettePng(
      pixels,
      40,
      40,
      async (bytes) => {
        seen.push(paletteEntriesOf(bytes));
        return 1;
      },
      { floor: 0.99 }
    );

    expect(seen).toEqual([20]);
    expect(result?.paletteSize).toBe(20);
    expect(result?.dithered).toBe(false);
  });

  it('falls back to the dithered sweep when the exact palette fails the floor', async () => {
    const colors: number[][] = [];
    for (let i = 0; i < 20; i += 1) {
      colors.push([(i * 47) % 256, (i * 91) % 256, (i * 13) % 256]);
    }
    const pixels = flatPixels(40, 40, colors);
    const seen: number[] = [];

    const result = await searchPalettePng(
      pixels,
      40,
      40,
      async (bytes) => {
        const entries = paletteEntriesOf(bytes);
        seen.push(entries);
        return entries >= 20 ? 0.5 : 1;
      },
      { floor: 0.99 }
    );

    expect(seen).toEqual([20, 16]);
    expect(result?.paletteSize).toBe(16);
    expect(result?.dithered).toBe(true);
  });
});

describe('quantization error', () => {
  it('keeps the no-dither path within 8/255 per channel on a smooth gradient', () => {
    const width = 256;
    const height = 256;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        pixels[i] = Math.round((x / (width - 1)) * 255);
        pixels[i + 1] = 64 + Math.round((y / (height - 1)) * 24);
        pixels[i + 2] = 128;
        pixels[i + 3] = 255;
      }
    }

    const palette = buildPalette(pixels, 256);
    const lut = buildNearestLut(palette);
    const indices = mapToIndices(pixels, width, height, palette, lut, false);

    let worst = 0;
    for (let i = 0; i < indices.length; i += 1) {
      const color = palette[indices[i]];
      for (let channel = 0; channel < 3; channel += 1) {
        const error = Math.abs(pixels[i * 4 + channel] - color[channel]);
        if (error > worst) worst = error;
      }
    }

    // Every 5-bit bucket has its own entry here, but a bucket is not a colour:
    // entries are cell averages, so the worst channel error is a few units.
    // Measured on this fixture: 4/255 plain, 7/255 dithered.
    expect(palette.length).toBeLessThanOrEqual(256);
    expect(worst).toBeLessThanOrEqual(8);
  });
});
