/**
 * The SVG domain: what an SVG *is*, structurally.
 *
 * Parsing and analysis are pure over the file text, so they live in the domain
 * and run anywhere — including the Web Worker, where `DOMParser` does not exist.
 * This is deliberately a structural scan, not a full XML validator: its job is
 * to classify the file and name its risks, which is what the engine needs before
 * it decides whether a transformation is safe.
 */

export type SvgComposition =
  'pure-vector' | 'raster-wrapper' | 'mixed' | 'complex-vector' | 'unsupported';

export type SvgRisk =
  | 'embedded-raster'
  | 'external-reference'
  | 'complex-filter'
  | 'mask'
  | 'clip-path'
  | 'text-dependent-rendering'
  | 'foreign-object'
  | 'unsupported-feature'
  | 'missing-viewbox'
  | 'dimension-dependent-rendering'
  | 'broken-reference';

export interface SvgParseError {
  code: string;
  message: string;
}

export interface SvgParseResult {
  /** Well-formed enough to be treated as an SVG document (root + balanced tags). */
  valid: boolean;
  errors: SvgParseError[];
}

export interface SvgStructure {
  width: number | null;
  height: number | null;
  viewBox: [number, number, number, number] | null;
  /** Root width/height declared as a percentage — rendering needs context. */
  percentageDimensions: boolean;

  elements: {
    paths: number;
    rects: number;
    circles: number;
    ellipses: number;
    polygons: number;
    polylines: number;
    lines: number;
    groups: number;
    text: number;
    images: number;
  };

  features: {
    gradients: number;
    masks: number;
    clipPaths: number;
    filters: number;
    patterns: number;
    foreignObjects: number;
  };

  references: {
    external: number;
    internal: number;
    /** `url(#id)` / `href="#id"` pointing at an id the document never defines. */
    broken: number;
  };
}

export interface SvgAnalysis {
  parse: SvgParseResult;
  structure: SvgStructure;
  composition: SvgComposition;
  risks: SvgRisk[];
}
