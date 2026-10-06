import type { SvgComposition, SvgRisk, SvgStructure } from './types';

/**
 * What kind of SVG this is.
 *
 * `unsupported` is not "invalid": it means the current implementation cannot
 * promise a safe transformation (a `foreignObject` is arbitrary HTML). Keeping
 * that distinction is the point — the user should read "we can't touch this
 * safely", not "your file is broken".
 */
export function classifySvg(structure: SvgStructure): SvgComposition {
  const { elements, features } = structure;
  if (features.foreignObjects > 0) return 'unsupported';

  const vector =
    elements.paths +
    elements.rects +
    elements.circles +
    elements.ellipses +
    elements.polygons +
    elements.polylines +
    elements.lines;
  const complex =
    features.filters > 0 || features.masks > 0 || features.patterns > 0 || elements.text > 0;

  if (elements.images === 0) return complex ? 'complex-vector' : 'pure-vector';
  if (vector === 0) return 'raster-wrapper';
  return 'mixed';
}

/** The attention points, so the UI can say "3 risks" instead of "unavailable". */
export function assessSvgRisks(structure: SvgStructure): SvgRisk[] {
  const { elements, features, references } = structure;
  const risks: SvgRisk[] = [];

  if (elements.images > 0) risks.push('embedded-raster');
  if (references.external > 0) risks.push('external-reference');
  if (features.filters > 0) risks.push('complex-filter');
  if (features.masks > 0) risks.push('mask');
  if (features.clipPaths > 0) risks.push('clip-path');
  if (elements.text > 0) risks.push('text-dependent-rendering');
  if (features.foreignObjects > 0) {
    risks.push('foreign-object');
    risks.push('unsupported-feature');
  }
  if (features.patterns > 0) risks.push('unsupported-feature');
  if (structure.viewBox === null) risks.push('missing-viewbox');
  if (structure.percentageDimensions) risks.push('dimension-dependent-rendering');
  if (references.broken > 0) risks.push('broken-reference');

  return risks;
}
