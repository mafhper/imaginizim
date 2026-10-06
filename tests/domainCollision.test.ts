import { describe, it, expect } from 'vitest';
import { resolveCollision } from '../src/domain/collision';

describe('resolveCollision', () => {
  it('keeps a free name', () => {
    expect(resolveCollision('photo.webp', [], 'suffix')).toEqual({
      name: 'photo.webp',
      action: 'keep'
    });
  });

  it('asks when the policy is ask', () => {
    expect(resolveCollision('photo.webp', ['photo.webp'], 'ask')).toEqual({
      name: 'photo.webp',
      action: 'ask'
    });
  });

  it('skips when the policy is skip', () => {
    expect(resolveCollision('photo.webp', ['photo.webp'], 'skip')).toEqual({
      name: 'photo.webp',
      action: 'skip'
    });
  });

  it('overwrites when the policy is overwrite', () => {
    expect(resolveCollision('photo.webp', ['photo.webp'], 'overwrite')).toEqual({
      name: 'photo.webp',
      action: 'overwrite'
    });
  });

  it('suffixes before the extension, finding the first free number', () => {
    expect(resolveCollision('photo.webp', ['photo.webp'], 'suffix')).toEqual({
      name: 'photo-1.webp',
      action: 'suffix'
    });
    expect(
      resolveCollision('photo.webp', ['photo.webp', 'photo-1.webp', 'photo-2.webp'], 'suffix')
    ).toEqual({ name: 'photo-3.webp', action: 'suffix' });
  });

  it('appends the suffix when there is no extension', () => {
    expect(resolveCollision('README', ['README'], 'suffix')).toEqual({
      name: 'README-1',
      action: 'suffix'
    });
  });

  it('treats a leading dot as part of the name, not an extension', () => {
    expect(resolveCollision('.gitignore', ['.gitignore'], 'suffix')).toEqual({
      name: '.gitignore-1',
      action: 'suffix'
    });
  });
});
