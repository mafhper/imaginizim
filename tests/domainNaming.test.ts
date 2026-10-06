import { describe, it, expect } from 'vitest';
import { resolveNaming, type NamingContext } from '../src/domain/naming';

function context(overrides: Partial<NamingContext> = {}): NamingContext {
  return { basename: 'logo', extension: 'webp', format: 'image/webp', ...overrides };
}

describe('resolveNaming', () => {
  it('fills basename and extension', () => {
    expect(resolveNaming('{basename}.{ext}', context())).toBe('logo.webp');
  });

  it('accepts {extension} as well as {ext}', () => {
    expect(resolveNaming('{basename}.{extension}', context())).toBe('logo.webp');
  });

  it('fills dimensions and scale', () => {
    expect(resolveNaming('{basename}-{width}w.{ext}', context({ width: 800 }))).toBe(
      'logo-800w.webp'
    );
    expect(resolveNaming('{basename}@{scale}x.{ext}', context({ scale: 2 }))).toBe('logo@2x.webp');
  });

  it('leaves an unknown token visible instead of erasing it', () => {
    expect(resolveNaming('{basename}-{variant}.{ext}', context())).toBe('logo-{variant}.webp');
  });

  it('leaves a known-but-absent token visible', () => {
    expect(resolveNaming('{basename}-{width}w.{ext}', context())).toBe('logo-{width}w.webp');
  });

  it('turns a number into text', () => {
    expect(resolveNaming('{basename}-{quality}.{ext}', context({ quality: 82 }))).toBe(
      'logo-82.webp'
    );
  });
});
