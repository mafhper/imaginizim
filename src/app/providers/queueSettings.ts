import type { QueueRecord, RecordSettings } from '../types';

function primaryFormat(settings: RecordSettings): string {
  return settings.outputs[0]?.format ?? 'original';
}

/** The format the first output implies for a given source file. */
export function primaryChosenFormat(settings: RecordSettings, file: File): string {
  const format = primaryFormat(settings);
  return format === 'original' ? file.type : format;
}

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
      // `null` is "not measured yet". It used to be `0`, which reads as a
      // measurement of zero similarity rather than the absence of one.
      qualityScore: null,
      metTarget: null,
      metadata: null,
      svg: null,
      artifacts: null,
      strategyUsed: record.status === 'queued' ? 'queued' : 'manual-reprocess',
      optimizedObjectUrl: null,
      compressedPreviewUrl: null,
      statusLabel: queuedStatusLabel,
      settings,
      chosenFormat: primaryChosenFormat(settings, record.file)
    };
  });
}
