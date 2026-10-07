import type { OptimizationMode } from '../types';

/**
 * SVG optimization profiles.
 *
 * `safe` is **new code**, not a preset: the old path ran `preset-default` (the
 * aggressive end) with no way back, and it applied `removeDimensions` even to
 * files without a `viewBox` — which breaks them. Here each profile is a curated
 * decision, and `safe` only touches things that cannot change the picture.
 */

export type SvgProfile = 'safe' | 'balanced' | 'aggressive';

/** The mode the UI exposes maps to an SVG profile; `safe` is the conservative end. */
export function profileForMode(mode: OptimizationMode): SvgProfile {
  if (mode === 'max-speed') return 'safe';
  if (mode === 'max-compression') return 'aggressive';
  return 'balanced';
}

interface SvgNode {
  name: string;
  attributes: Record<string, string>;
}

/**
 * Adds `color-interpolation-filters="sRGB"` to every filter.
 *
 * It is the **only** mutation that is unambiguously safe: without it, filters
 * interpolate in linearRGB and visibly diverge from what CSS/canvas produces.
 * Adding `sRGB` can only make the render match the CSS renderer.
 */
export const srgbFiltersPlugin = {
  name: 'imaginizim-srgb-filters',
  fn: () => ({
    element: {
      enter: (node: SvgNode) => {
        if (node.name === 'filter') {
          node.attributes['color-interpolation-filters'] = 'sRGB';
        }
      }
    }
  })
};

/** Plugins that remove or normalize without touching geometry, color or structure. */
const SAFE_PLUGINS = [
  'removeDoctype',
  'removeXMLProcInst',
  'removeComments',
  'removeMetadata',
  'removeEditorsNSData',
  'cleanupAttrs',
  'mergeStyles',
  'cleanupIds',
  'removeUselessDefs',
  'cleanupNumericValues',
  'removeEmptyAttrs',
  'removeEmptyContainers',
  'removeEmptyText',
  'removeUnusedNS',
  'sortAttrs'
];

export interface SvgOptimizerOptions {
  multipass: boolean;
  js2svg: { indent: number; pretty: boolean };
  plugins: unknown[];
}

export function svgOptionsFor(profile: SvgProfile): SvgOptimizerOptions {
  const js2svg = { indent: 0, pretty: false };

  if (profile === 'safe') {
    return {
      multipass: false,
      js2svg,
      plugins: [
        ...SAFE_PLUGINS.map((name) =>
          name === 'cleanupNumericValues' ? { name, params: { floatPrecision: 3 } } : name
        ),
        srgbFiltersPlugin
      ]
    };
  }

  const floatPrecision = profile === 'aggressive' ? 2 : 3;
  const plugins: unknown[] = [
    {
      name: 'preset-default',
      params: {
        overrides: {
          cleanupNumericValues: { floatPrecision },
          convertPathData: { floatPrecision }
        }
      }
    }
  ];

  // `removeDimensions` is only allowed where the user asked for the smallest
  // file: on a document without a viewBox it removes the only size it has.
  if (profile === 'aggressive') plugins.push('removeDimensions');
  plugins.push('sortAttrs', srgbFiltersPlugin);

  return { multipass: profile === 'aggressive', js2svg, plugins };
}
