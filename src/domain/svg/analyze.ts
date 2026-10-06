import { assessSvgRisks, classifySvg } from './classify';
import { buildStructure } from './structure';
import { tokenizeSvg } from './tokenize';
import type { SvgAnalysis } from './types';

/**
 * Parse + structure + classification + risk, in one pure pass over the text.
 *
 * A parse failure is a **result**, not an exception: "could not read" and "read
 * it, and its structure is problematic" are different answers, and the caller
 * needs both.
 */
export function analyzeSvg(text: string): SvgAnalysis {
  const { tags, errors } = tokenizeSvg(text);
  const structure = buildStructure(tags);

  return {
    parse: { valid: errors.length === 0, errors },
    structure,
    composition: classifySvg(structure),
    risks: assessSvgRisks(structure)
  };
}
