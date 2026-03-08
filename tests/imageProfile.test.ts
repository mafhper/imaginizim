import { describe, expect, it } from 'vitest';
import { classifyProfile } from '../src/worker/analysis/imageProfile';

describe('image profile classifier', () => {
  it('classifies transparent simple assets as transparent-graphic', () => {
    const result = classifyProfile({ hasAlpha: true, complexity: 0.1, flatness: 0.8 });
    expect(result).toBe('transparent-graphic');
  });

  it('classifies flat non-alpha screenshots as ui-screenshot', () => {
    const result = classifyProfile({ hasAlpha: false, complexity: 0.18, flatness: 0.82 });
    expect(result).toBe('ui-screenshot');
  });

  it('classifies low complexity non-alpha assets as graphic', () => {
    const result = classifyProfile({ hasAlpha: false, complexity: 0.12, flatness: 0.35 });
    expect(result).toBe('graphic');
  });

  it('classifies high complexity assets as photo', () => {
    const result = classifyProfile({ hasAlpha: false, complexity: 0.32, flatness: 0.2 });
    expect(result).toBe('photo');
  });
});
