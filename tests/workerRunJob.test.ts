import { describe, it, expect } from 'vitest';
import { runJob } from '../src/worker/job/runJob';
import type { JobCodecs } from '../src/worker/job/codecs';
import type { OutputFormat } from '../src/types';
import type { OutputSpec } from '../src/domain/types';

/**
 * The engine is pure orchestration over injected codecs, so it is tested with
 * fakes: no canvas, no SVGO, no worker. The contract is the behaviour — one
 * analysis, N artifacts, failures isolated, per-artifact validation.
 */

function output(id: string, format: OutputFormat = 'image/webp'): OutputSpec {
  return { id, format };
}

const file = new File([new Uint8Array(1000)], 'photo.png', { type: 'image/png' });

function setup(overrides: Partial<JobCodecs> = {}) {
  const state = { analyzeCalls: 0, encodeCalls: 0 };
  const codecs: JobCodecs = {
    analyzeSource: async () => {
      state.analyzeCalls += 1;
      return {
        profile: { kind: 'photo', width: 100, height: 100, hasAlpha: false, complexity: 0.5 },
        metadata: null,
        svg: null,
        originalSize: 1000
      };
    },
    encodeOutput: async (_file, _type, spec) => {
      state.encodeCalls += 1;
      if (spec.id === 'bad') throw new Error('encode failed');
      return {
        blob: new Blob([new Uint8Array(10)]),
        format: spec.format,
        qualityScore: 1,
        strategyUsed: 'fake'
      };
    },
    validate: async () => true,
    finalize: async (blob) => ({ blob, exifKeptForOrientation: false, artifactFindings: null }),
    ...overrides
  };
  return { codecs, state };
}

describe('runJob', () => {
  it('produces one artifact per output, in order', async () => {
    const { codecs } = setup();

    const { artifacts } = await runJob(
      { file, type: 'image/png', outputs: [output('a'), output('b', 'image/avif')] },
      codecs
    );

    expect(artifacts.map((artifact) => artifact.id)).toEqual(['a', 'b']);
    expect(artifacts.every((artifact) => artifact.status === 'done')).toBe(true);
    expect(artifacts[0].format).toBe('image/webp');
    expect(artifacts[1].format).toBe('image/avif');
  });

  it('analyses the source once, no matter how many outputs', async () => {
    const { codecs, state } = setup();

    await runJob(
      { file, type: 'image/png', outputs: [output('a'), output('b'), output('c')] },
      codecs
    );

    expect(state.analyzeCalls).toBe(1);
    expect(state.encodeCalls).toBe(3);
  });

  it('does not let one failing artifact take down the others', async () => {
    const { codecs } = setup();

    const { artifacts } = await runJob(
      { file, type: 'image/png', outputs: [output('a'), output('bad'), output('c')] },
      codecs
    );

    expect(artifacts.map((artifact) => artifact.status)).toEqual(['done', 'error', 'done']);
    expect(artifacts[1].error).toMatch(/encode failed/);
  });

  it('marks an artifact as error when the bytes do not match the format', async () => {
    const { codecs } = setup({ validate: async () => false });

    const { artifacts } = await runJob({ file, type: 'image/png', outputs: [output('a')] }, codecs);

    expect(artifacts[0].status).toBe('error');
    expect(artifacts[0].validation?.ok).toBe(false);
    expect(artifacts[0].validation?.issues[0].code).toBe('format-mismatch');
  });

  it('carries the source analysis in the result', async () => {
    const { codecs } = setup();

    const { source } = await runJob({ file, type: 'image/png', outputs: [output('a')] }, codecs);

    expect(source.originalSize).toBe(1000);
  });
});
