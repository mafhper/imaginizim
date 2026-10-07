import { describe, expect, it } from 'vitest';
import { applyProcessingSettings } from '../src/app/providers/queueSettings';
import type { QueueRecord, RecordSettings } from '../src/app/types';
import type { OutputSpec } from '../src/domain/types';

function output(overrides: Partial<OutputSpec> = {}): OutputSpec {
  return {
    id: 'output-1',
    format: 'original',
    quality: 0.78,
    scale: 1,
    optimizationMode: 'balanced',
    targetBytes: null,
    ...overrides
  };
}

function settings(outputs: OutputSpec[]): RecordSettings {
  return { outputs };
}

describe('queue processing settings', () => {
  it('applies the current settings before the first queue processing run', () => {
    const original = settings([output()]);
    const current = settings([
      output({ format: 'image/webp', optimizationMode: 'max-compression' })
    ]);
    const queuedPng = queueRecord({
      id: 'png-1',
      type: 'image/png',
      settings: original,
      chosenFormat: 'image/png'
    });

    const [result] = applyProcessingSettings([queuedPng], ['png-1'], current, 'Na fila');

    expect(result.settings).toEqual(current);
    expect(result.chosenFormat).toBe('image/webp');
    expect(result.status).toBe('queued');
    expect(result.blob).toBeNull();
  });

  it('uses the original file type only when the primary output is original', () => {
    const current = settings([output()]);
    const queuedWebp = queueRecord({
      id: 'webp-1',
      type: 'image/webp',
      settings: current,
      chosenFormat: 'image/png'
    });

    const [result] = applyProcessingSettings([queuedWebp], ['webp-1'], current, 'Na fila');

    expect(result.chosenFormat).toBe('image/webp');
  });

  it('resets an unmeasured score to null, not to zero', () => {
    const current = settings([output({ format: 'auto' })]);
    const record = queueRecord({
      id: 'png-1',
      type: 'image/png',
      settings: current,
      chosenFormat: 'image/png'
    });

    const [result] = applyProcessingSettings([record], ['png-1'], current, 'Na fila');

    // `0` claims the similarity is zero. The score is not measured until the
    // worker answers, and that answer can legitimately be "unmeasurable".
    expect(result.qualityScore).toBeNull();
  });

  it('clears a stale score when a reprocess is queued', () => {
    const current = settings([output({ format: 'auto' })]);
    const record = {
      ...queueRecord({
        id: 'png-1',
        type: 'image/png',
        settings: current,
        chosenFormat: 'image/png'
      }),
      status: 'done' as const
    };

    const [result] = applyProcessingSettings([record], ['png-1'], current, 'Na fila');

    expect(result.qualityScore).toBeNull();
    expect(result.blob).toBeNull();
    expect(result.newSize).toBeNull();
    expect(result.compressedPreviewUrl).toBeNull();
    expect(result.artifacts).toBeNull();
  });
});

function queueRecord({
  id,
  type,
  settings: recordSettings,
  chosenFormat
}: {
  id: string;
  type: string;
  settings: RecordSettings;
  chosenFormat: string;
}): QueueRecord {
  return {
    id,
    file: new File(['image'], `${id}.png`, { type }),
    status: 'queued',
    selected: false,
    blob: null,
    originalSize: 5,
    newSize: null,
    chosenFormat,
    qualityScore: 0.94,
    strategyUsed: 'queued',
    sourceObjectUrl: 'blob:source',
    optimizedObjectUrl: null,
    previewUrl: 'blob:preview',
    compressedPreviewUrl: null,
    statusLabel: 'Na fila',
    errorMessage: null,
    progress: 0,
    settings: recordSettings
  };
}
