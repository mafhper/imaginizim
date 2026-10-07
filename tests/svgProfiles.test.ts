import { describe, it, expect } from 'vitest';
import {
  profileForMode,
  srgbFiltersPlugin,
  svgOptionsFor,
  type SvgProfile
} from '../src/worker/codecs/svgProfiles';

/**
 * The profiles are data, so they are tested as data: which plugin sets are
 * allowed to touch geometry, color or structure. The point of `safe` is the
 * list of things it does *not* do.
 */
function pluginNames(profile: SvgProfile): string[] {
  return svgOptionsFor(profile).plugins.map((plugin) =>
    typeof plugin === 'string' ? plugin : (plugin as { name: string }).name
  );
}

describe('profileForMode', () => {
  it('maps the fastest mode to the safest profile', () => {
    expect(profileForMode('max-speed')).toBe('safe');
  });

  it('maps the smallest-size mode to the aggressive profile', () => {
    expect(profileForMode('max-compression')).toBe('aggressive');
  });

  it('maps balanced to balanced', () => {
    expect(profileForMode('balanced')).toBe('balanced');
  });
});

describe('svgOptionsFor', () => {
  it('safe never removes dimensions and never runs the aggressive preset', () => {
    const names = pluginNames('safe');

    expect(names).not.toContain('preset-default');
    expect(names).not.toContain('removeDimensions');
    expect(names).not.toContain('mergePaths');
    expect(names).not.toContain('convertPathData');
    expect(names).not.toContain('convertShapeToPath');
    expect(svgOptionsFor('safe').multipass).toBe(false);
  });

  it('safe keeps the numeric precision explicit and applies sRGB to filters', () => {
    const names = pluginNames('safe');

    expect(names).toContain('cleanupNumericValues');
    expect(names).toContain('imaginizim-srgb-filters');
  });

  it('balanced runs the preset but still does not remove dimensions', () => {
    const names = pluginNames('balanced');

    expect(names).toContain('preset-default');
    expect(names).not.toContain('removeDimensions');
    expect(svgOptionsFor('balanced').multipass).toBe(false);
  });

  it('aggressive is the only one that removes dimensions and multipasses', () => {
    const names = pluginNames('aggressive');

    expect(names).toContain('removeDimensions');
    expect(svgOptionsFor('aggressive').multipass).toBe(true);
  });

  it('every profile applies sRGB to filters', () => {
    expect(srgbFiltersPlugin.name).toBe('imaginizim-srgb-filters');
    for (const profile of ['safe', 'balanced', 'aggressive'] as SvgProfile[]) {
      expect(pluginNames(profile)).toContain('imaginizim-srgb-filters');
    }
  });
});
