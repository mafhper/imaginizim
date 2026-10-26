import { describe, it, expect } from 'vitest';
import { quantizeToPalettePng, searchPalettePng } from '../src/worker/codecs/palettePng';

/**
 * Fixture guard for the quantization *result*, not just its parts.
 *
 * Three 512×512 images shaped like the content the candidate is for — a UI with
 * text and edges, a gradient with flat blocks, a soft illustration — driven
 * through the real pipeline. The byte ceilings are regression guards, set from
 * the measured output of this encoder (2026-10-26) with margin: they are not a
 * claim that another encoder cannot beat them.
 *
 * The fidelity check mirrors `estimateQualityScore` (1 - rmse/255 over a 40×40
 * sample) with a deterministic area-average downscale, because the production
 * one goes through `createImageBitmap` and only exists in a browser. The
 * browser-measured scores are in the task document; these are the numbers a
 * `node` test run can reproduce.
 */

const W = 512;
const H = 512;

function fill(
  data: Uint8ClampedArray,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: number[]
) {
  for (let y = Math.max(0, y0); y < Math.min(H, y1); y += 1) {
    for (let x = Math.max(0, x0); x < Math.min(W, x1); x += 1) {
      const i = (y * W + x) * 4;
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = 255;
    }
  }
}

function uiFixture(): Uint8ClampedArray {
  const data = new Uint8ClampedArray(W * H * 4);
  data.fill(255);
  fill(data, 0, 0, W, 64, [243, 244, 246]);
  fill(data, 0, 64, W, 66, [229, 231, 235]);
  fill(data, 0, 66, 140, H, [238, 242, 255]);

  const ink = [
    [17, 24, 39],
    [55, 65, 81],
    [107, 114, 128]
  ];
  let seed = 7;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  for (let line = 0; line < 34; line += 1) {
    const y = 86 + line * 12;
    const width = 100 + ((line * 73) % 300);
    for (let x = 170; x < 170 + width; x += 1) {
      if (random() < 0.42) fill(data, x, y, x + 1, y + 7, ink[Math.floor(random() * ink.length)]);
    }
  }

  fill(data, 350, 96, 470, 128, [37, 99, 235]);
  fill(data, 350, 140, 470, 172, [220, 38, 38]);
  return data;
}

function gradientFixture(): Uint8ClampedArray {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const t = (x / (W - 1) + y / (H - 1)) / 2;
      const i = (y * W + x) * 4;
      data[i] = Math.round(16 + 232 * t);
      data[i + 1] = Math.round(40 + 190 * Math.sqrt(t));
      data[i + 2] = Math.round(90 + 150 * Math.cos((t * Math.PI) / 2));
      data[i + 3] = 255;
    }
  }
  fill(data, 40, 330, 210, 480, [18, 24, 38]);
  fill(data, 260, 60, 470, 220, [250, 250, 252]);
  fill(data, 260, 250, 470, 300, [37, 99, 235]);
  fill(data, 40, 60, 210, 120, [245, 158, 11]);
  return data;
}

function illustrationFixture(): Uint8ClampedArray {
  const data = new Uint8ClampedArray(W * H * 4);
  const blobs = [
    { cx: 150, cy: 170, sigma: 130, color: [236, 120, 96], amp: 0.95 },
    { cx: 370, cy: 140, sigma: 95, color: [94, 148, 210], amp: 0.85 },
    { cx: 300, cy: 370, sigma: 150, color: [120, 180, 130], amp: 0.8 },
    { cx: 120, cy: 410, sigma: 85, color: [210, 180, 90], amp: 0.65 }
  ];

  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 4;
      let r = 248;
      let g = 244;
      let b = 236;
      for (const blob of blobs) {
        const weight =
          blob.amp * Math.exp(-((x - blob.cx) ** 2 + (y - blob.cy) ** 2) / (2 * blob.sigma ** 2));
        r += (blob.color[0] - r) * weight;
        g += (blob.color[1] - g) * weight;
        b += (blob.color[2] - b) * weight;
      }
      data[i] = Math.max(0, Math.min(255, Math.round(r)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
      data[i + 3] = 255;
    }
  }
  return data;
}

/** Same formula as `estimateQualityScore`, deterministic downscale. */
function fidelity(source: Uint8ClampedArray, candidate: Uint8ClampedArray): number {
  const size = 40;
  const sample = (data: Uint8ClampedArray): Float64Array => {
    const out = new Float64Array(size * size * 3);
    for (let dy = 0; dy < size; dy += 1) {
      const y0 = (dy * H) / size;
      const y1 = ((dy + 1) * H) / size;
      for (let dx = 0; dx < size; dx += 1) {
        const x0 = (dx * W) / size;
        const x1 = ((dx + 1) * W) / size;
        let r = 0;
        let g = 0;
        let b = 0;
        let area = 0;
        for (let y = Math.floor(y0); y < Math.ceil(y1); y += 1) {
          const wy = Math.min(y1, y + 1) - Math.max(y0, y);
          for (let x = Math.floor(x0); x < Math.ceil(x1); x += 1) {
            const weight = (Math.min(x1, x + 1) - Math.max(x0, x)) * wy;
            const i = (y * W + x) * 4;
            r += data[i] * weight;
            g += data[i + 1] * weight;
            b += data[i + 2] * weight;
            area += weight;
          }
        }
        const o = (dy * size + dx) * 3;
        out[o] = r / area;
        out[o + 1] = g / area;
        out[o + 2] = b / area;
      }
    }
    return out;
  };

  const a = sample(source);
  const b = sample(candidate);
  let mse = 0;
  for (let i = 0; i < a.length; i += 1) {
    const delta = a[i] - b[i];
    mse += delta * delta;
  }
  return 1 - Math.sqrt(mse / a.length) / 255;
}

/**
 * Decodes an indexed PNG this module wrote, straight from the format: inflate,
 * undo the row filters, look the indices up in PLTE. Written here from the spec
 * rather than imported, so a writer bug cannot hide behind a shared helper.
 */
async function decodeIndexedPng(
  bytes: Uint8Array
): Promise<{ width: number; height: number; rgba: Uint8ClampedArray }> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  let width = 0;
  let height = 0;
  let plte: Uint8Array | null = null;
  const parts: Uint8Array[] = [];

  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    const data = bytes.slice(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      const header = new DataView(data.buffer, data.byteOffset, 13);
      width = header.getUint32(0);
      height = header.getUint32(4);
    } else if (type === 'PLTE') {
      plte = data;
    } else if (type === 'IDAT') {
      parts.push(data);
    }
    offset += 12 + length;
  }

  if (!plte) throw new Error('PLTE missing');
  const merged = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    merged.set(part, at);
    at += part.length;
  }

  const stream = new Blob([merged]).stream().pipeThrough(new DecompressionStream('deflate'));
  const raw = new Uint8Array(await new Response(stream).arrayBuffer());

  const stride = width + 1;
  const previous = new Uint8Array(width);
  const row = new Uint8Array(width);
  const indices = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * stride];
    for (let x = 0; x < width; x += 1) {
      const left = x > 0 ? row[x - 1] : 0;
      const up = previous[x];
      const upLeft = x > 0 ? previous[x - 1] : 0;
      let value = raw[y * stride + 1 + x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += Math.floor((left + up) / 2);
      else if (filter === 4) {
        const estimate = left + up - upLeft;
        const dl = Math.abs(estimate - left);
        const du = Math.abs(estimate - up);
        const dul = Math.abs(estimate - upLeft);
        value += dl <= du && dl <= dul ? left : du <= dul ? up : upLeft;
      }
      row[x] = value & 0xff;
      indices[y * width + x] = row[x];
    }
    previous.set(row);
  }

  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < indices.length; i += 1) {
    const index = indices[i];
    rgba[i * 4] = plte[index * 3];
    rgba[i * 4 + 1] = plte[index * 3 + 1];
    rgba[i * 4 + 2] = plte[index * 3 + 2];
    rgba[i * 4 + 3] = 255;
  }

  return { width, height, rgba };
}

describe('palette PNG on 512×512 fixtures', () => {
  it('writes a lossless palette for a UI with a small colour set', async () => {
    const source = uiFixture();

    const artifact = await quantizeToPalettePng(source, W, H, { maxColors: 16 });
    expect(artifact).not.toBeNull();
    if (!artifact) return;

    expect(artifact.dithered).toBe(false);
    expect(artifact.paletteSize).toBeLessThanOrEqual(16);
    expect(artifact.bytes.length).toBeLessThanOrEqual(6000);

    const decoded = await decodeIndexedPng(artifact.bytes);
    expect(decoded.width).toBe(W);
    expect(decoded.height).toBe(H);
    // "Exact palette" is a claim about pixels, not about flags: every pixel
    // must come back byte-identical.
    expect(Array.from(decoded.rgba)).toEqual(Array.from(source));
  });

  it('picks the exact palette of a gradient and beats the dithered rungs', async () => {
    const source = gradientFixture();

    const found = await searchPalettePng(
      source,
      W,
      H,
      async (bytes) => fidelity(source, (await decodeIndexedPng(bytes)).rgba),
      { floor: 0.99 }
    );

    expect(found).not.toBeNull();
    if (!found) return;

    expect(found.dithered).toBe(false);
    expect(found.attempts).toBe(1);
    expect(found.bytes.length).toBeLessThanOrEqual(6000);
    expect(found.score).toBeGreaterThanOrEqual(0.99);
  });

  it('carries a soft illustration at 256 colours with a dithered palette', async () => {
    const source = illustrationFixture();

    const artifact = await quantizeToPalettePng(source, W, H, { maxColors: 256 });
    expect(artifact).not.toBeNull();
    if (!artifact) return;

    expect(artifact.dithered).toBe(true);
    expect(artifact.paletteSize).toBeLessThanOrEqual(256);
    expect(artifact.bytes.length).toBeLessThanOrEqual(160000);

    const decoded = await decodeIndexedPng(artifact.bytes);
    expect(fidelity(source, decoded.rgba)).toBeGreaterThanOrEqual(0.96);
  });
});
