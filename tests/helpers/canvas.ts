/**
 * A test double for `createImageBitmap` + `OffscreenCanvas`.
 *
 * Measured, not assumed: happy-dom provides a document, but
 * `OffscreenCanvas.getContext('2d')` returns null and `createImageBitmap`
 * rejects a Blob. So canvas-dependent engine code cannot be tested against the
 * DOM environment, and asserting on it in a browser test would be testing the
 * browser, not the code.
 *
 * This stands in for both, with a real (if small) nearest-neighbour rasteriser:
 * `paint(x, y)` describes the source image, and the double samples it at
 * whatever size the code under test asks for. That makes sampling behaviour
 * part of the test surface — a profile reported at the wrong dimensions shows
 * up as wrong pixels, not just wrong metadata.
 */

export type Rgba = [number, number, number, number];

export type Paint = (x: number, y: number, width: number, height: number) => Rgba;

export interface FakeImage {
  width: number;
  height: number;
  paint: Paint;
}

interface FakeBitmap {
  width: number;
  height: number;
  close: () => void;
  __source: FakeImage;
  __closed: boolean;
}

interface FakeContext {
  drawImage: (source: FakeBitmap, dx: number, dy: number, dWidth: number, dHeight: number) => void;
  getImageData: (x: number, y: number, w: number, h: number) => { data: Uint8ClampedArray };
}

const registry = new WeakMap<object, FakeImage>();

/** Registers the image that the next `createImageBitmap` call should return. */
export function setFakeImage(blob: object, image: FakeImage): void {
  registry.set(blob, image);
}

/** Solid-colour image, the common case for profile tests. */
export function solidImage(width: number, height: number, rgba: Rgba): FakeImage {
  return { width, height, paint: () => rgba };
}

/** Two-colour image split vertically, for flatness/complexity tests. */
export function splitImage(width: number, height: number, left: Rgba, right: Rgba): FakeImage {
  return {
    width,
    height,
    paint: (x) => (x < width / 2 ? left : right)
  };
}

/**
 * High-frequency noise, for the "is this photographic" branch.
 * The hash keeps neighbouring pixels far apart, which is what
 * `calculateComplexity` measures.
 */
export function noiseImage(width: number, height: number, seed = 1): FakeImage {
  return {
    width,
    height,
    paint: (x, y) => {
      let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
      h = (h ^ (h >>> 13)) * 1274126177;
      h = h ^ (h >>> 16);
      return [(h >>> 0) & 255, (h >>> 8) & 255, (h >>> 16) & 255, 255];
    }
  };
}

function sample(image: FakeImage, x: number, y: number, w: number, h: number): Rgba {
  const sx = Math.min(image.width - 1, Math.floor((x / w) * image.width));
  const sy = Math.min(image.height - 1, Math.floor((y / h) * image.height));
  return image.paint(sx, sy, image.width, image.height);
}

/** Installs the double on the current global scope. Returns a restore function. */
export function installCanvasDouble(): () => void {
  const originalCreateImageBitmap = globalThis.createImageBitmap;
  const originalOffscreenCanvas = globalThis.OffscreenCanvas;

  globalThis.createImageBitmap = (async (blob: object) => {
    const image = registry.get(blob);
    if (!image) {
      throw new Error(
        'createImageBitmap: no fake image registered for this blob. Call setFakeImage() first.'
      );
    }
    const bitmap: FakeBitmap = {
      width: image.width,
      height: image.height,
      close() {
        this.__closed = true;
      },
      __source: image,
      __closed: false
    };
    return bitmap as unknown as ImageBitmap;
  }) as typeof createImageBitmap;

  globalThis.OffscreenCanvas = class {
    constructor(
      public width: number,
      public height: number
    ) {}

    getContext(): FakeContext | null {
      let current: FakeImage | null = null;

      return {
        drawImage(source: FakeBitmap) {
          current = source.__source;
        },
        getImageData(_x: number, _y: number, w: number, h: number) {
          if (!current) {
            throw new Error('getImageData before drawImage');
          }
          const data = new Uint8ClampedArray(w * h * 4);
          for (let py = 0; py < h; py += 1) {
            for (let px = 0; px < w; px += 1) {
              const [r, g, b, a] = sample(current, px, py, w, h);
              const i = (py * w + px) * 4;
              data[i] = r;
              data[i + 1] = g;
              data[i + 2] = b;
              data[i + 3] = a;
            }
          }
          return { data };
        }
      } as FakeContext;
    }
  } as unknown as typeof OffscreenCanvas;

  return () => {
    globalThis.createImageBitmap = originalCreateImageBitmap;
    globalThis.OffscreenCanvas = originalOffscreenCanvas;
  };
}
