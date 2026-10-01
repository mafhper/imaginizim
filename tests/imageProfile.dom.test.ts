import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { analyzeRasterProfile } from '../src/worker/analysis/imageProfile';
import {
  installCanvasDouble,
  noiseImage,
  setFakeImage,
  solidImage,
  splitImage
} from './helpers/canvas';

/**
 * `analyzeRasterProfile` had no test at all: it needs `createImageBitmap` and
 * `OffscreenCanvas`, and the environment could not provide them. It also
 * reported 0x0 for every image for months, because `bitmap.close()` ran before
 * the dimensions were read — the very bug this file now pins down.
 */
describe('raster profile analysis', () => {
  let restore: () => void;

  beforeEach(() => {
    restore = installCanvasDouble();
  });

  afterEach(() => {
    restore();
  });

  function blob(): Blob {
    return new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
  }

  it('reports the real dimensions, not zero', async () => {
    const source = blob();
    setFakeImage(source, solidImage(1200, 800, [10, 20, 30, 255]));

    const profile = await analyzeRasterProfile(source);

    expect(profile.width).toBe(1200);
    expect(profile.height).toBe(800);
  });

  it('reports real dimensions on a tall image too', async () => {
    const source = blob();
    setFakeImage(source, solidImage(300, 1600, [10, 20, 30, 255]));

    const profile = await analyzeRasterProfile(source);

    expect(profile.width).toBe(300);
    expect(profile.height).toBe(1600);
  });

  it('never reports zero for any size', async () => {
    for (const [w, h] of [
      [1, 1],
      [16, 16],
      [1920, 1080],
      [64, 4096]
    ] as const) {
      const source = blob();
      setFakeImage(source, solidImage(w, h, [128, 128, 128, 255]));

      const profile = await analyzeRasterProfile(source);

      expect({ w: h, width: profile.width, height: profile.height }).toEqual({
        w: h,
        width: w,
        height: h
      });
    }
  });

  it('detects alpha in a transparent image', async () => {
    const source = blob();
    setFakeImage(source, solidImage(64, 64, [10, 20, 30, 0]));

    const profile = await analyzeRasterProfile(source);

    expect(profile.hasAlpha).toBe(true);
  });

  it('reports no alpha for an opaque image', async () => {
    const source = blob();
    setFakeImage(source, solidImage(64, 64, [10, 20, 30, 255]));

    const profile = await analyzeRasterProfile(source);

    expect(profile.hasAlpha).toBe(false);
  });

  it('calls a flat opaque image a ui screenshot', async () => {
    const source = blob();
    setFakeImage(source, solidImage(64, 64, [200, 40, 40, 255]));

    const profile = await analyzeRasterProfile(source);

    // A perfectly flat, fully opaque image is what `classifyProfile` checks
    // `ui-screenshot` first. Order matters there: flatness is checked before
    // the generic `graphic` threshold.
    expect(profile.kind).toBe('ui-screenshot');
    expect(profile.complexity).toBe(0);
    expect(profile.hasAlpha).toBe(false);
  });

  it('calls a noisy image a photo', async () => {
    const source = blob();
    setFakeImage(source, noiseImage(64, 64));

    const profile = await analyzeRasterProfile(source);

    expect(profile.kind).toBe('photo');
    expect(profile.complexity).toBeGreaterThanOrEqual(0.16);
  });

  it('classifies a transparent flat image as a transparent graphic', async () => {
    const source = blob();
    setFakeImage(source, solidImage(64, 64, [0, 128, 255, 10]));

    const profile = await analyzeRasterProfile(source);

    expect(profile.hasAlpha).toBe(true);
    expect(profile.kind).toBe('transparent-graphic');
  });

  it('uses a real sample size, so a two-tone image reads as low complexity', async () => {
    const source = blob();
    setFakeImage(source, splitImage(200, 100, [0, 0, 0, 255], [255, 255, 255, 255]));

    const profile = await analyzeRasterProfile(source);

    // Two large flat areas, whatever size the profile claims.
    expect(profile.complexity).toBeLessThan(0.5);
    expect(profile.kind).not.toBe('photo');
  });

  it('fails loudly when asked to decode something unregistered', async () => {
    await expect(analyzeRasterProfile(blob())).rejects.toThrow(/no fake image registered/);
  });
});
