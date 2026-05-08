import type { QueueRecord, RecordSettings } from '../types';

export function applyProcessingSettings(
  records: QueueRecord[],
  targetIds: string[],
  settings: RecordSettings,
  queuedStatusLabel: string
): QueueRecord[] {
  const targetIdSet = new Set(targetIds);

  return records.map((record) => {
    if (!targetIdSet.has(record.id)) return record;

    return {
      ...record,
      status: 'queued',
      progress: 0,
      errorMessage: null,
      blob: null,
      newSize: null,
      qualityScore: 0,
      strategyUsed: record.status === 'queued' ? 'queued' : 'manual-reprocess',
      optimizedObjectUrl: null,
      compressedPreviewUrl: null,
      statusLabel: queuedStatusLabel,
      settings,
      chosenFormat: settings.outputFormat === 'original' ? record.file.type : settings.outputFormat
    };
  });
}
