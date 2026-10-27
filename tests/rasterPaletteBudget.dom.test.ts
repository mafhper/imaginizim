import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compressRasterToPalettePng } from '../src/worker/codecs/raster';
import { installCanvasDouble, setFakeImage, solidImage } from './helpers/canvas';

/**
 * The palette candidate's budget gate must answer **before** the master exists.
 *
 * `renderMaster` decodes the whole file and draws it — 5.4 s on a 12 MP PNG,
 * measured 2026-10-27 — and the answer above `PALETTE_MAX_PIXELS` is always
 * `null`. The caller already knows the source dimensions from `analyzeSource`,
 * so the gate can run first.
 *
 * Counting decodes is the seam: above the budget the file must never be
 * decoded, and below it the master must still be rendered. A palette result is
 * not asserted here — that path is covered by `palettePng.test.ts` — because the
 * fake bitmap has no encoder behind it, only a rasteriser.
 */
describe('palette candidate budget gate', () => {
  let restore: () => void;
  let decodes = 0;

  beforeEach(() => {
    decodes = 0;
    restore = installCanvasDouble();
    const double = globalThis.createImageBitmap;
    globalThis.createImageBitmap = (async (source: unknown) => {
      decodes += 1;
      return double(source as Blob);
    }) as typeof createImageBitmap;
  });

  afterEach(() => {
    restore();
  });

  function source(width: number, height: number): Blob {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
    setFakeImage(blob, solidImage(width, height, [10, 20, 30, 255]));
    return blob;
  }

  it('answers above the 4 MP budget without decoding the file', async () => {
    // 4000×3000 = 12 MP: the measured 5.4 s decode the gate now prevents.
    const file = source(4000, 3000);

    const result = await compressRasterToPalettePng(file, {
      scale: 1,
      profileKind: 'photo',
      width: 4000,
      height: 3000
    });

    expect(result).toBeNull();
    expect(decodes).toBe(0);
  });

  it('applies the scale before judging the budget', async () => {
    // 1000×1000 is 1 MP — inside the budget — but the master is rendered at 3×,
    // so 9 MP is what the gate must judge. Reading the source size alone would
    // let the 9 MP master through.
    const file = source(1000, 1000);

    const result = await compressRasterToPalettePng(file, {
      scale: 3,
      profileKind: 'photo',
      width: 1000,
      height: 1000
    });

    expect(result).toBeNull();
    expect(decodes).toBe(0);
  });

  it('still renders the master when the scaled image is inside the budget', async () => {
    // 4000×3000 at 0.25 is 1000×750 — inside the budget, so the master is built.
    const file = source(4000, 3000);

    const result = await compressRasterToPalettePng(file, {
      scale: 0.25,
      profileKind: 'photo',
      width: 4000,
      height: 3000
    });

    expect(decodes).toBeGreaterThan(0);
    // `null` here is the unmeasurable score, not the budget: the double has no
    // PNG encoder, so no rung can be scored. The render is what this asserts.
    expect(result).toBeNull();
  });

  it('still renders and checks afterwards when the dimensions are unknown', async () => {
    const file = source(4000, 3000);

    const result = await compressRasterToPalettePng(file, { scale: 1, profileKind: 'photo' });

    expect(decodes).toBe(1);
    expect(result).toBeNull();
  });
});
