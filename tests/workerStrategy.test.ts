import { describe, expect, it } from 'vitest';
import { buildCandidates, getQualityThreshold } from '../src/worker/selection/strategy';
import type { ImageProfile } from '../src/worker/types';

describe('worker strategy', () => {
  const photoProfile: ImageProfile = {
    kind: 'photo',
    width: 2000,
    height: 1300,
    hasAlpha: false,
    complexity: 0.42
  };

  it('builds auto candidates for photo profile', () => {
    const candidates = buildCandidates('image/jpeg', 'auto', photoProfile, 'balanced');
    const formats = candidates.map((item) => item.format);

    expect(formats).toContain('image/avif');
    expect(formats).toContain('image/webp');
    expect(formats).toContain('image/jpeg');
  });

  it('returns manual target for explicit output format', () => {
    const candidates = buildCandidates('image/png', 'image/webp', photoProfile, 'balanced');
    expect(candidates).toEqual([
      {
        format: 'image/webp',
        strategyUsed: 'manual-balanced'
      }
    ]);
  });

  it('uses stricter threshold for max speed', () => {
    expect(getQualityThreshold('max-speed')).toBeGreaterThan(getQualityThreshold('balanced'));
    expect(getQualityThreshold('balanced')).toBeGreaterThan(getQualityThreshold('max-compression'));
  });
});
