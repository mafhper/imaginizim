import { describe, expect, it } from 'vitest';
import { applyProcessingSettings } from '../src/app/providers/queueSettings';
import type { QueueRecord, RecordSettings } from '../src/app/types';

describe('queue processing settings', () => {
  it('applies the current global settings before the first queue processing run', () => {
    const originalSettings: RecordSettings = {
      quality: 0.78,
      scale: 1,
      outputFormat: 'original',
      optimizationMode: 'balanced'
    };
    const currentSettings: RecordSettings = {
      quality: 0.78,
      scale: 1,
      outputFormat: 'image/webp',
      optimizationMode: 'max-compression'
    };
    const queuedPng = queueRecord({
      id: 'png-1',
      type: 'image/png',
      settings: originalSettings,
      chosenFormat: 'image/png'
    });

    const [result] = applyProcessingSettings([queuedPng], ['png-1'], currentSettings, 'Na fila');

    expect(result.settings).toEqual(currentSettings);
    expect(result.chosenFormat).toBe('image/webp');
    expect(result.status).toBe('queued');
    expect(result.blob).toBeNull();
  });

  it('uses the original file type only when the current setting is original', () => {
    const currentSettings: RecordSettings = {
      quality: 0.78,
      scale: 1,
      outputFormat: 'original',
      optimizationMode: 'balanced'
    };
    const queuedWebp = queueRecord({
      id: 'webp-1',
      type: 'image/webp',
      settings: currentSettings,
      chosenFormat: 'image/png'
    });

    const [result] = applyProcessingSettings([queuedWebp], ['webp-1'], currentSettings, 'Na fila');

    expect(result.chosenFormat).toBe('image/webp');
  });
});

function queueRecord({
  id,
  type,
  settings,
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
    qualityScore: 0,
    strategyUsed: 'queued',
    sourceObjectUrl: 'blob:source',
    optimizedObjectUrl: null,
    previewUrl: 'blob:preview',
    compressedPreviewUrl: null,
    statusLabel: 'Na fila',
    errorMessage: null,
    progress: 0,
    settings
  };
}
