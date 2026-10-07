import type { OptimizationMode } from '../types';
import { profileForMode, svgOptionsFor } from './svgProfiles';

const svgoUrl = `${import.meta.env.BASE_URL}svgo.browser.js`;

let optimizeSvg: ((input: string, options?: object) => { data: string }) | null = null;
let svgoInitialized = false;

async function initSvgo(): Promise<void> {
  if (svgoInitialized) return;

  const svgoModule = await new Function('url', 'return import(url)')(svgoUrl);
  optimizeSvg = svgoModule.optimize;
  svgoInitialized = true;
}

/**
 * Optimizes an SVG under the profile the mode implies.
 *
 * The validation lives one layer up (in the job codecs), where the original and
 * the optimized text are both in hand — this function only transforms.
 */
export async function optimizeSvgBlob(file: Blob, mode: OptimizationMode): Promise<Blob> {
  await initSvgo();

  if (!optimizeSvg) {
    throw new Error('SVGO failed to initialize.');
  }

  const text = await file.text();
  const result = optimizeSvg(text, svgOptionsFor(profileForMode(mode)));
  return new Blob([result.data], { type: 'image/svg+xml' });
}
