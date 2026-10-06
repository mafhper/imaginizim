import { describe, it, expect } from 'vitest';
import { planJob, jobStatusFromArtifacts } from '../src/domain/job';
import { planDelivery } from '../src/domain/delivery';
import type { OutputSpec } from '../src/domain/types';

function output(overrides: Partial<OutputSpec> = {}): OutputSpec {
  return { id: 'o1', format: 'image/webp', ...overrides };
}

describe('planJob', () => {
  it('resolves a name per output from the source basename', () => {
    const planned = planJob({ name: 'logo.png' }, [output()]);

    expect(planned[0].name).toBe('logo.webp');
    expect(planned[0].collision).toBe('keep');
  });

  it('suffixes the second output that would collide', () => {
    const planned = planJob({ name: 'logo.png' }, [output({ id: 'a' }), output({ id: 'b' })]);

    expect(planned[0].name).toBe('logo.webp');
    expect(planned[1].name).toBe('logo-1.webp');
    expect(planned[1].collision).toBe('suffix');
  });

  it('resolves scale into the name', () => {
    const planned = planJob({ name: 'hero.jpg' }, [
      output({ naming: { pattern: '{basename}@{scale}x.{ext}' }, scale: 2 })
    ]);

    expect(planned[0].name).toBe('hero@2x.webp');
  });

  it('leaves an unknown dimension token visible when the source has no size', () => {
    const planned = planJob({ name: 'hero.jpg' }, [
      output({ naming: { pattern: '{basename}-{width}w.{ext}' } })
    ]);

    expect(planned[0].name).toBe('hero-{width}w.webp');
  });

  it('uses the source extension for auto/original outputs', () => {
    const planned = planJob({ name: 'photo.png' }, [output({ format: 'original' })]);

    expect(planned[0].name).toBe('photo.png');
  });
});

describe('jobStatusFromArtifacts', () => {
  it('is queued with nothing', () => {
    expect(jobStatusFromArtifacts([])).toBe('queued');
  });

  it('is processing while any artifact is pending or encoding', () => {
    expect(jobStatusFromArtifacts([{ status: 'done' }, { status: 'pending' }])).toBe('processing');
  });

  it('is done when all are done', () => {
    expect(jobStatusFromArtifacts([{ status: 'done' }, { status: 'done' }])).toBe('done');
  });

  it('is partial when some fail and some succeed', () => {
    expect(jobStatusFromArtifacts([{ status: 'done' }, { status: 'error' }])).toBe('partial');
  });

  it('is error when all fail', () => {
    expect(jobStatusFromArtifacts([{ status: 'error' }])).toBe('error');
  });
});

describe('planDelivery', () => {
  it('delivers a single artifact directly', () => {
    expect(planDelivery([{ id: 'a' }])).toEqual({ mode: 'single', artifactIds: ['a'] });
  });

  it('offers a directory for several, with zip as an explicit choice', () => {
    expect(planDelivery([{ id: 'a' }, { id: 'b' }])).toEqual({
      mode: 'directory',
      artifactIds: ['a', 'b']
    });
    expect(planDelivery([{ id: 'a' }, { id: 'b' }], 'zip')).toEqual({
      mode: 'zip',
      artifactIds: ['a', 'b']
    });
  });
});
