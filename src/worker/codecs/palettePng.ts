/**
 * Palette PNG — lossy quantization for indexed PNGs, in pure TypeScript.
 *
 * The canvas encoder can only write lossless PNG: `convertToBlob({ type:
 * 'image/png' })` ignores `quality` entirely, so every PNG that left this app
 * kept all 24 bits per pixel. For UI and gradient content that is the whole gap:
 * the same pixels at 256 colours cost a fraction of the bytes, and the visual
 * difference is dither noise.
 *
 * Nothing here touches the DOM. Pixels arrive as `Uint8ClampedArray`, the stream
 * compressor is the platform's `CompressionStream`, and the absence of that API
 * is a supported state (`null` — the candidate simply does not exist).
 *
 * Measured 2026-10-26 on 512×512 fixtures. The reference is the project's own
 * baseline, `compressRaster` (UPNG), **not** the input file size: the PNG path
 * already compresses, so quoting the original file overstated the gain by an
 * order of magnitude.
 *   UI with text/edges        12 617 B →  3 203 B  (22 colours, no dither, 0.9977)
 *   gradient + blocks         22 179 B →  9 896 B  (56 colours, no dither, 0.9953)
 *   binary-alpha logo          2 763 B →  2 620 B  (51 colours, 0.9995)
 *   soft illustration        111 320 B →  refused by the 0.99 floor
 *
 * The byte ceiling is the row that mattered: the baseline
 * `compressRasterWithinBudget` spent six attempts and ~9 s to return
 * `metTarget: false` with a 60 877–291 652 B blob, while the palette answers
 * 3 203 B (UI) and 9 896 B (gradient) in ~700 ms with `metTarget: true`.
 *
 * That probe is the origin of the policy constants below: the ladder and the
 * fidelity floors.
 */

import type { ImageKind } from '../types';

/**
 * Above this size the palette candidate does not pay for itself: measured in
 * 2026-10-27, the cost grows ~2 s/MP and at 6/8/12 MP it spent 13/18/24 s only
 * to be refused by the fidelity floor.
 */
export const PALETTE_MAX_PIXELS = 4_000_000;

/**
 * Whether the palette candidate is worth building at all for this size. It is
 * the single gate — the histogram, the LUT and the encode are all skipped above
 * the budget, because paying for any of them is paying for a candidate that is
 * discarded on photo-like content.
 */
export function paletteWithinBudget(width: number, height: number): boolean {
  return width > 0 && height > 0 && width * height <= PALETTE_MAX_PIXELS;
}

/** Alpha at or below this is treated as fully transparent. */
export const TRANSPARENT_ALPHA_MAX = 8;

/** Alpha at or above this is treated as fully opaque. */
export const OPAQUE_ALPHA_MIN = 250;

/**
 * Tolerance band → binary alpha. A pixel whose alpha the encoder has to binarize
 * is transparent below this value and opaque from it up: an almost invisible
 * edge pixel disappearing is the lesser artefact.
 */
export const BINARY_ALPHA_MIDPOINT = 128;

/**
 * Share of partially transparent pixels the encoder tolerates. Above it the
 * candidate is abandoned: a binary `tRNS` entry cannot represent a soft edge,
 * and faking it would be a visible regression, not a compression choice.
 */
export const SEMI_TRANSPARENT_LIMIT = 0.02;

/** 5 bits per channel: a 32³ bucket grid is 32 768 cells. */
const HIST_BITS = 5;
const HIST_SHIFT = 8 - HIST_BITS;
const HIST_MASK = (1 << HIST_BITS) - 1;
const CUBE_SIZE = 1 << (HIST_BITS * 3);

interface Histogram {
  /** Pixels per bucket. */
  counts: Uint32Array;
  /** Per-channel running sum, so the bucket colour is exact to the pixel. */
  red: Float64Array;
  green: Float64Array;
  blue: Float64Array;
  /** Pixels that will be written as opaque (alpha >= BINARY_ALPHA_MIDPOINT). */
  opaque: number;
  /** Pixels that will be written as transparent. */
  transparent: number;
  /** Pixels in the 9..249 band the policy tolerates only up to 2%. */
  semiTransparent: number;
  /** Occupied buckets — the honest lower bound for "how many colours". */
  distinct: number;
}

/** Key of the 5-bit cube cell that contains a colour. */
export function cubeKey(r: number, g: number, b: number): number {
  return (
    ((r >> HIST_SHIFT) << (HIST_BITS * 2)) | ((g >> HIST_SHIFT) << HIST_BITS) | (b >> HIST_SHIFT)
  );
}

function axisOf(key: number, axis: number): number {
  return (key >> ((2 - axis) * HIST_BITS)) & HIST_MASK;
}

/** Centre of the cell, in 0..255 — the value both the LUT and the scan use. */
function axisCenter(key: number, axis: number): number {
  return Math.min(255, axisOf(key, axis) * (1 << HIST_SHIFT) + (1 << (HIST_SHIFT - 1)));
}

/** The colour a cube cell stands for. The LUT domain is these representatives. */
export function cubeRepresentative(key: number): [number, number, number] {
  return [axisCenter(key, 0), axisCenter(key, 1), axisCenter(key, 2)];
}

function scanPixels(pixels: Uint8ClampedArray): Histogram {
  const counts = new Uint32Array(CUBE_SIZE);
  const red = new Float64Array(CUBE_SIZE);
  const green = new Float64Array(CUBE_SIZE);
  const blue = new Float64Array(CUBE_SIZE);

  let opaque = 0;
  let transparent = 0;
  let semiTransparent = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];

    if (alpha > TRANSPARENT_ALPHA_MAX && alpha < OPAQUE_ALPHA_MIN) semiTransparent += 1;

    if (alpha < BINARY_ALPHA_MIDPOINT) {
      transparent += 1;
      continue;
    }

    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const key = cubeKey(r, g, b);

    opaque += 1;
    counts[key] += 1;
    red[key] += r;
    green[key] += g;
    blue[key] += b;
  }

  let distinct = 0;
  for (let key = 0; key < CUBE_SIZE; key += 1) {
    if (counts[key] > 0) distinct += 1;
  }

  return { counts, red, green, blue, opaque, transparent, semiTransparent, distinct };
}

interface Box {
  start: number;
  end: number;
  count: number;
}

function boxCount(buckets: number[], counts: Uint32Array, start: number, end: number): number {
  let count = 0;
  for (let i = start; i < end; i += 1) count += counts[buckets[i]];
  return count;
}

function boxExtents(buckets: number[], start: number, end: number): [number, number, number] {
  const min = [255, 255, 255];
  const max = [0, 0, 0];

  for (let i = start; i < end; i += 1) {
    const key = buckets[i];
    for (let axis = 0; axis < 3; axis += 1) {
      const center = axisCenter(key, axis);
      if (center < min[axis]) min[axis] = center;
      if (center > max[axis]) max[axis] = center;
    }
  }

  return [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
}

function boxColor(buckets: number[], histogram: Histogram, start: number, end: number): number[] {
  let count = 0;
  let r = 0;
  let g = 0;
  let b = 0;

  for (let i = start; i < end; i += 1) {
    const key = buckets[i];
    count += histogram.counts[key];
    r += histogram.red[key];
    g += histogram.green[key];
    b += histogram.blue[key];
  }

  if (count === 0) return [0, 0, 0];
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
}

/**
 * Median cut over the occupied buckets: split the widest axis of the most
 * populated box, at the weighted median, until the quota is filled.
 *
 * Colours are averages of the buckets in the box — weighted by pixel count, so
 * a large flat area is not outvoted by a noisy corner.
 */
function paletteFromHistogram(histogram: Histogram, maxColors: number): number[][] {
  const buckets: number[] = [];
  for (let key = 0; key < CUBE_SIZE; key += 1) {
    if (histogram.counts[key] > 0) buckets.push(key);
  }

  if (buckets.length === 0) return [[0, 0, 0]];

  const limit = Math.max(1, Math.min(maxColors, 256));
  const boxes: Box[] = [
    { start: 0, end: buckets.length, count: boxCount(buckets, histogram.counts, 0, buckets.length) }
  ];

  while (boxes.length < limit) {
    let target = -1;
    for (let i = 0; i < boxes.length; i += 1) {
      const box = boxes[i];
      if (box.end - box.start < 2) continue;
      if (target < 0 || box.count > boxes[target].count) target = i;
    }
    if (target < 0) break;

    const box = boxes[target];
    const extents = boxExtents(buckets, box.start, box.end);
    const axis =
      extents[0] >= extents[1] && extents[0] >= extents[2] ? 0 : extents[1] >= extents[2] ? 1 : 2;
    if (extents[axis] === 0) break;

    const segment = buckets
      .slice(box.start, box.end)
      .sort((a, b) => axisOf(a, axis) - axisOf(b, axis));
    buckets.splice(box.start, segment.length, ...segment);

    const half = box.count / 2;
    let running = 0;
    let split = box.start;
    for (let i = box.start; i < box.end - 1; i += 1) {
      running += histogram.counts[buckets[i]];
      split = i + 1;
      if (running >= half) break;
    }

    if (split <= box.start || split >= box.end) {
      // Degenerate box: nothing to gain from splitting it further.
      break;
    }

    boxes[target] = {
      start: box.start,
      end: split,
      count: boxCount(buckets, histogram.counts, box.start, split)
    };
    boxes.push({
      start: split,
      end: box.end,
      count: boxCount(buckets, histogram.counts, split, box.end)
    });
  }

  return boxes.map((box) => boxColor(buckets, histogram, box.start, box.end));
}

/** Median-cut palette for an RGBA buffer. Returns at most `maxColors` colours. */
export function buildPalette(pixels: Uint8ClampedArray, maxColors: number): number[][] {
  return paletteFromHistogram(scanPixels(pixels), maxColors);
}

/**
 * Nearest-colour lookup for the whole 5-bit cube: 32 768 entries instead of a
 * palette scan per pixel. The metric is luminance-weighted (0.30/0.59/0.11), so
 * an error in green costs more than the same error in blue — which is what the
 * eye does.
 *
 * The table is indexed by `cubeKey(r, g, b)`, evaluated at the cell centre, so
 * a colour and its immediate neighbours in the same cell share one answer.
 */
export function buildNearestLut(palette: number[][]): Uint8Array {
  if (palette.length === 0) {
    throw new RangeError('buildNearestLut needs at least one colour.');
  }
  if (palette.length > 256) {
    throw new RangeError('A palette PNG cannot hold more than 256 entries.');
  }

  const lut = new Uint8Array(CUBE_SIZE);

  for (let key = 0; key < CUBE_SIZE; key += 1) {
    const r = axisCenter(key, 0);
    const g = axisCenter(key, 1);
    const b = axisCenter(key, 2);

    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < palette.length; i += 1) {
      const dr = r - palette[i][0];
      const dg = g - palette[i][1];
      const db = b - palette[i][2];
      const distance = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }

    lut[key] = best;
  }

  return lut;
}

const FS_RIGHT = 7 / 16;
const FS_DOWN_LEFT = 3 / 16;
const FS_DOWN = 5 / 16;
const FS_DOWN_RIGHT = 1 / 16;

function clampByte(value: number): number {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return value;
}

/**
 * Maps every pixel to a palette index, optionally with Floyd–Steinberg error
 * diffusion.
 *
 * The error lives in **two row buffers**, never in a float image: at 12 MP a
 * full float RGBA buffer is 192 MB, which is exactly the kind of allocation that
 * gets a worker killed. Two rows cost `(width + 2) * 3 * 4` bytes each.
 *
 * `transparentIndex` (when >= 0) wins over the LUT for pixels whose alpha is at
 * or below `TRANSPARENT_ALPHA_MAX`; those pixels also diffuse no error, so a
 * hard edge is not smeared into the dither pattern.
 */
export function mapToIndices(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  palette: number[][],
  lut: Uint8Array,
  dither: boolean,
  transparentIndex = -1
): Uint8Array {
  const indices = new Uint8Array(Math.max(0, width * height));
  if (width <= 0 || height <= 0) return indices;

  const stride = (width + 2) * 3;
  let current = new Float32Array(stride);
  let next = new Float32Array(stride);

  for (let y = 0; y < height; y += 1) {
    if (dither) next.fill(0);

    for (let x = 0; x < width; x += 1) {
      const source = (y * width + x) * 4;
      const target = y * width + x;

      if (transparentIndex >= 0 && pixels[source + 3] < BINARY_ALPHA_MIDPOINT) {
        indices[target] = transparentIndex;
        continue;
      }

      let r = pixels[source];
      let g = pixels[source + 1];
      let b = pixels[source + 2];

      if (dither) {
        r += current[(x + 1) * 3];
        g += current[(x + 1) * 3 + 1];
        b += current[(x + 1) * 3 + 2];
        r = clampByte(r);
        g = clampByte(g);
        b = clampByte(b);
      }

      const index = lut[cubeKey(r, g, b)];
      indices[target] = index;

      if (!dither) continue;

      const errorR = r - palette[index][0];
      const errorG = g - palette[index][1];
      const errorB = b - palette[index][2];

      current[(x + 2) * 3] += errorR * FS_RIGHT;
      current[(x + 2) * 3 + 1] += errorG * FS_RIGHT;
      current[(x + 2) * 3 + 2] += errorB * FS_RIGHT;

      next[x * 3] += errorR * FS_DOWN_LEFT;
      next[x * 3 + 1] += errorG * FS_DOWN_LEFT;
      next[x * 3 + 2] += errorB * FS_DOWN_LEFT;

      next[(x + 1) * 3] += errorR * FS_DOWN;
      next[(x + 1) * 3 + 1] += errorG * FS_DOWN;
      next[(x + 1) * 3 + 2] += errorB * FS_DOWN;

      next[(x + 2) * 3] += errorR * FS_DOWN_RIGHT;
      next[(x + 2) * 3 + 1] += errorG * FS_DOWN_RIGHT;
      next[(x + 2) * 3 + 2] += errorB * FS_DOWN_RIGHT;
    }

    if (dither) {
      const swap = current;
      current = next;
      next = swap;
    }
  }

  return indices;
}

// --- PNG writer --------------------------------------------------------------

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[n] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i += 1) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const distanceLeft = Math.abs(estimate - left);
  const distanceUp = Math.abs(estimate - up);
  const distanceUpLeft = Math.abs(estimate - upLeft);
  if (distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft) return left;
  if (distanceUp <= distanceUpLeft) return up;
  return upLeft;
}

/** Applies one PNG row filter (bpp is 1: indexed data) into `target`. */
function applyFilter(
  type: number,
  row: Uint8Array,
  previous: Uint8Array,
  target: Uint8Array
): Uint8Array {
  for (let i = 0; i < row.length; i += 1) {
    const left = i > 0 ? row[i - 1] : 0;
    const up = previous[i];
    const upLeft = i > 0 ? previous[i - 1] : 0;

    let value = row[i];
    if (type === 1) value -= left;
    else if (type === 2) value -= up;
    else if (type === 3) value -= Math.floor((left + up) / 2);
    else if (type === 4) value -= paeth(left, up, upLeft);

    target[i] = value;
  }

  return target;
}

const FILTER_TYPES = [0, 1, 2, 3, 4];

/**
 * Per-row adaptive filtering: for each row, pick the filter with the smallest
 * sum of absolute (signed) byte values. One pass per filter type, then the
 * winner is written once — the heuristic libpng uses, and on indexed data it is
 * what lets deflate find the flat regions.
 */
function filterRows(indices: Uint8Array, width: number, height: number): Uint8Array {
  const stride = width + 1;
  const raw = new Uint8Array(stride * height);
  const row = new Uint8Array(width);
  const previous = new Uint8Array(width);
  const candidate = new Uint8Array(width);

  for (let y = 0; y < height; y += 1) {
    row.set(indices.subarray(y * width, (y + 1) * width));

    let bestType = 0;
    let bestScore = Infinity;
    for (const type of FILTER_TYPES) {
      applyFilter(type, row, previous, candidate);
      let score = 0;
      for (let i = 0; i < candidate.length; i += 1) {
        const byte = candidate[i];
        score += byte < 128 ? byte : 256 - byte;
      }
      if (score < bestScore) {
        bestScore = score;
        bestType = type;
      }
    }

    const out = raw.subarray(y * stride, (y + 1) * stride);
    out[0] = bestType;
    applyFilter(bestType, row, previous, out.subarray(1));
    previous.set(row);
  }

  return raw;
}

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const part of chunks) total += part.length;

  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of chunks) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function collectStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  const pump = async (): Promise<Uint8Array> => {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.length;
      }
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of chunks) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  };

  return pump();
}

/** One zlib stream for the whole IDAT — `deflate` is already the expensive part. */
async function deflateBytes(input: Uint8Array): Promise<Uint8Array> {
  const compressor = new CompressionStream('deflate');
  // The reader is attached before the write so backpressure can drain.
  const drained = collectStream(compressor.readable);
  const writer = compressor.writable.getWriter();
  // `slice()` is the copy that gives the view a plain (non-shared) ArrayBuffer,
  // which is what `BufferSource` accepts. It is bounded by the filtered stream,
  // and deflate dwarfs it.
  await writer.write(input.slice());
  await writer.close();
  return drained;
}

export interface PalettePngInput {
  /** RGB triples. At most 256 entries — the PNG limit. */
  palette: number[][];
  /** One palette index per pixel, row-major. */
  indices: Uint8Array;
  width: number;
  height: number;
  /** Index reserved for transparent pixels, or -1 when the image is opaque. */
  transparentIndex: number;
}

/**
 * Writes an indexed PNG (bit depth 8, colour type 3): IHDR, PLTE, optional tRNS,
 * IDAT, IEND.
 *
 * Returns `null` — not an error — when the platform has no `CompressionStream`:
 * the candidate does not exist there, and the caller keeps the lossless path.
 */
export async function encodePalettePng({
  palette,
  indices,
  width,
  height,
  transparentIndex
}: PalettePngInput): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  if (width <= 0 || height <= 0) {
    throw new RangeError('A palette PNG needs a positive size.');
  }
  if (palette.length === 0 || palette.length > 256) {
    throw new RangeError('A palette PNG holds between 1 and 256 entries.');
  }
  if (indices.length !== width * height) {
    throw new RangeError('Index buffer does not match the image size.');
  }

  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width);
  headerView.setUint32(4, height);
  header[8] = 8; // bit depth
  header[9] = 3; // colour type: indexed
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  const plte = new Uint8Array(palette.length * 3);
  for (let i = 0; i < palette.length; i += 1) {
    plte[i * 3] = palette[i][0];
    plte[i * 3 + 1] = palette[i][1];
    plte[i * 3 + 2] = palette[i][2];
  }

  const chunks: Uint8Array[] = [PNG_SIGNATURE, chunk('IHDR', header), chunk('PLTE', plte)];

  if (transparentIndex >= 0 && transparentIndex < palette.length) {
    const trns = new Uint8Array(transparentIndex + 1).fill(255);
    trns[transparentIndex] = 0;
    chunks.push(chunk('tRNS', trns));
  }

  const raw = filterRows(indices, width, height);
  const compressed = await deflateBytes(raw);
  chunks.push(chunk('IDAT', compressed));
  chunks.push(chunk('IEND', new Uint8Array(0)));

  return concatChunks(chunks);
}

export interface QuantizeOptions {
  /** Upper bound for PLTE entries (1..256). One is reserved when the image has alpha. */
  maxColors: number;
  /**
   * Overrides the policy decision. By default only a palette that covers every
   * 5-bit bucket skips dithering.
   */
  dither?: boolean;
}

export interface PalettePngResult {
  bytes: Uint8Array;
  /** PLTE entries written, transparency included. */
  paletteSize: number;
  dithered: boolean;
}

async function quantizeWithScan(
  scan: Histogram,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  options: QuantizeOptions
): Promise<PalettePngResult | null> {
  const hasAlpha = scan.transparent > 0;
  const capacity = hasAlpha ? 255 : 256;
  const maxColors = Math.max(1, Math.min(Math.floor(options.maxColors), capacity));

  const colors = paletteFromHistogram(scan, maxColors);
  // Buckets, not colours: a 5-bit cell groups colours that differ by up to 7 per
  // channel, and each entry is the cell average, so "every bucket fits" is not
  // lossless. Measured worst case per channel on this path is 4–7/255 — under the
  // visible threshold — so dithering would add noise and bytes for no perceptible
  // gain. Above the quota the bound does not hold (measured 11–32/255), which is
  // why the ascending ladder still relies on the fidelity floor.
  // The measured score still has the last word.
  const bucketExact = scan.distinct <= maxColors;
  const dither = options.dither ?? !bucketExact;

  const palette = hasAlpha ? [...colors, [0, 0, 0]] : colors;
  const transparentIndex = hasAlpha ? palette.length - 1 : -1;
  const lut = buildNearestLut(colors);
  const indices = mapToIndices(pixels, width, height, palette, lut, dither, transparentIndex);

  const bytes = await encodePalettePng({ palette, indices, width, height, transparentIndex });
  if (!bytes) return null;

  return { bytes, paletteSize: palette.length, dithered: dither };
}

/**
 * Palette PNG for an RGBA buffer, or `null` when the candidate does not apply:
 * no `CompressionStream`, an image above `PALETTE_MAX_PIXELS`, or too much soft
 * transparency for a binary tRNS.
 */
export async function quantizeToPalettePng(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  options: QuantizeOptions
): Promise<PalettePngResult | null> {
  if (typeof CompressionStream === 'undefined') return null;
  if (!paletteWithinBudget(width, height)) return null;

  const scan = scanPixels(pixels);
  const total = scan.opaque + scan.transparent;
  if (total > 0 && scan.semiTransparent / total > SEMI_TRANSPARENT_LIMIT) return null;

  return quantizeWithScan(scan, pixels, width, height, options);
}

// --- Quality policy ----------------------------------------------------------

/**
 * Ascending palette ladder, measured on the 2026-10-26 probe: 16 colours
 * handles UI and icons exactly, 32 already carries a dithered gradient, 256 is
 * the ceiling the format allows.
 */
export const PALETTE_LADDER: readonly number[] = [16, 32, 64, 128, 256];

/**
 * Fidelity floor per image kind, also from the probe. A palette PNG is a lossy
 * candidate; the floors are what keeps it from being a bad one. `photo` is
 * allowed more slack because dither noise on texture is far less visible than
 * banding on a flat panel.
 */
export const PALETTE_FIDELITY_FLOOR: Record<ImageKind, number> = {
  graphic: 0.99,
  'ui-screenshot': 0.99,
  'transparent-graphic': 0.99,
  photo: 0.96,
  vector: 0.99
};

export interface PaletteSearchOptions {
  /** Minimum `estimateQualityScore` the artifact must reach. */
  floor: number;
  /**
   * Byte ceiling. When set, the ladder is first-fit: the smallest palette that
   * fits is the winner, instead of the first that reaches the floor.
   */
  targetBytes?: number | null;
  ladder?: readonly number[];
}

export interface PaletteSearchResult extends PalettePngResult {
  /** Measured fidelity of `bytes`. Files are only returned when it was measured. */
  score: number;
  attempts: number;
  elapsedMs: number;
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/**
 * Walks the ladder and returns the first palette PNG that is acceptable.
 *
 * Two contracts live here, both measured 2026-10-26:
 *   - without a byte ceiling, "acceptable" is fidelity: stop at the first
 *     palette that clears the floor, because bigger palettes only cost bytes;
 *   - with a byte ceiling, the quality ladder is degenerate on PNG (4 qualities
 *     produced identical bytes and hashes), so the ladder is walked by *palette
 *     size* instead: the first artifact that fits the ceiling and keeps the
 *     floor wins — with the exact rung considered first, for the reason below.
 *
 * An immeasurable score is a rejection, not a pass: "unverified" must never be
 * selected as "good" — the same rule the candidate chooser already follows.
 *
 * An image above `PALETTE_MAX_PIXELS` returns `null` before the histogram is
 * built: the scan, the LUT and every encode are skipped, which is the whole
 * point of the budget.
 *
 * **The bucket-exact palette is tried first.** When the 5-bit histogram has no
 * more buckets than the quota, every bucket gets its own entry and the encoder
 * skips dithering (a few units per channel — not lossless) — and that breaks the
 * size monotonicity the ascending ladder assumes. Measured on the gradient
 * fixture: 32 colours (dithered) → 53 487 B at 0.993, 128 colours (exact, 75
 * entries) → 4 181 B at 0.995. Stopping at the first *passing* rung would ship
 * the 13× larger, less faithful artifact, so the exact rung is attempted before
 * the ascending sweep. If it fails the floor or the ceiling, the sweep runs
 * exactly as specified.
 */
export async function searchPalettePng(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  score: (bytes: Uint8Array) => Promise<number | null>,
  options: PaletteSearchOptions
): Promise<PaletteSearchResult | null> {
  const started = now();
  if (!paletteWithinBudget(width, height)) return null;

  const scan = scanPixels(pixels);
  const total = scan.opaque + scan.transparent;
  if (total === 0) return null;
  if (scan.semiTransparent / total > SEMI_TRANSPARENT_LIMIT) return null;

  const ladder = options.ladder ?? PALETTE_LADDER;
  const ceiling =
    typeof options.targetBytes === 'number' && options.targetBytes > 0 ? options.targetBytes : 0;
  const capacity = scan.transparent > 0 ? 255 : 256;

  const bucketExactStep = ladder.find((step) => step >= Math.min(scan.distinct, capacity));
  const steps: number[] = [];
  if (bucketExactStep !== undefined && scan.distinct <= capacity) steps.push(bucketExactStep);
  for (const step of ladder) {
    if (!steps.includes(step)) steps.push(step);
  }

  let attempts = 0;
  let bucketExactRejected = false;

  for (const step of steps) {
    const isBucketExact = scan.distinct <= Math.min(step, capacity);
    // Every rung at or above the bucket count produces byte-identical output;
    // once that artifact was rejected, re-encoding it is pure cost.
    if (isBucketExact && bucketExactRejected) continue;

    const result = await quantizeWithScan(scan, pixels, width, height, { maxColors: step });
    if (!result) return null;
    attempts += 1;

    if (ceiling > 0 && result.bytes.length > ceiling) continue;

    const measured = await score(result.bytes);
    if (measured === null || measured < options.floor) {
      if (isBucketExact) bucketExactRejected = true;
      continue;
    }

    return { ...result, score: measured, attempts, elapsedMs: now() - started };
  }

  return null;
}
