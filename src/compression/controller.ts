import { createFileListManager } from './fileProcessing';
import { createWorkerClient } from './workerClient';
import { files, getSelectedFileId, globalSettings, setSelectedFileId } from '../state/appState';
import type { ProcessedFileRecord } from '../types';
import { createId } from '../utils/id';

interface CompressionSetup {
  fileList: HTMLElement;
  queueCountEl: HTMLElement;
  totalSavedEl: HTMLElement;
  actionsBar: HTMLElement;
  studioControls: HTMLElement;
  onOpenComparison: (id: string) => void;
  onSelectionChanged: (record: ProcessedFileRecord | null) => void;
  onProcessingCompleted: (record: ProcessedFileRecord) => void;
  t: (key: string) => string;
}

function shouldProcess(record: ProcessedFileRecord): boolean {
  return record.status !== 'processing';
}

export function createCompressionController(setup: CompressionSetup) {
  const workerClient = createWorkerClient();
  const listManager = createFileListManager({
    fileList: setup.fileList,
    queueCountEl: setup.queueCountEl,
    totalSavedEl: setup.totalSavedEl,
    actionsBar: setup.actionsBar,
    studioControls: setup.studioControls,
    onOpenComparison: setup.onOpenComparison,
    onSelectFile: selectFile,
    t: setup.t
  });

  workerClient.onMessage((response) => {
    listManager.applyWorkerResult(response);
    const record = files.get(response.id);
    if (record?.status === 'done') {
      setup.onProcessingCompleted(record);
    }
  });

  function queueFile(file: File): void {
    const id = createId();
    const record: ProcessedFileRecord = {
      id,
      file,
      status: 'queued',
      selected: files.size === 0,
      blob: null,
      originalSize: file.size,
      newSize: null,
      chosenFormat:
        globalSettings.outputFormat === 'original' ? file.type : globalSettings.outputFormat,
      qualityScore: 0,
      strategyUsed: 'queued',
      sourceObjectUrl: URL.createObjectURL(file),
      optimizedObjectUrl: null
    };

    files.set(id, record);
    listManager.upsert(record);

    if (record.selected) {
      setSelectedFileId(id);
      setup.onSelectionChanged(record);
    }
  }

  function processRecord(record: ProcessedFileRecord): void {
    if (!shouldProcess(record)) return;

    const isReprocess = record.status === 'done';
    record.status = 'processing';
    record.strategyUsed = isReprocess ? 'manual-reprocess' : 'queued';
    listManager.update(record);

    workerClient.process({
      version: 1,
      id: record.id,
      file: record.file,
      type: record.file.type,
      quality: globalSettings.quality,
      scale: globalSettings.scale,
      outputFormat: globalSettings.outputFormat,
      mode: globalSettings.optimizationMode,
      profileHint: {
        kind: record.strategyUsed.startsWith('manual') ? 'photo' : undefined
      }
    });
  }

  function optimizeSelected(): void {
    const selectedId = getSelectedFileId();
    if (!selectedId) return;

    const record = files.get(selectedId);
    if (!record) return;

    processRecord(record);
  }

  function optimizeQueue(): void {
    files.forEach((record) => {
      processRecord(record);
    });
  }

  function selectFile(id: string): void {
    listManager.setSelected(id);
    setup.onSelectionChanged(files.get(id) ?? null);
  }

  function getRecord(id: string): ProcessedFileRecord | undefined {
    return files.get(id);
  }

  function getComparableRecords(): ProcessedFileRecord[] {
    return Array.from(files.values()).filter((record) => record.status === 'done');
  }

  function refreshTexts(): void {
    listManager.refreshAllTexts();
  }

  function refreshShell(): void {
    listManager.updateShellState();
  }

  function clearList(): void {
    listManager.clear();
  }

  return {
    queueFiles(incoming: File[]) {
      incoming.forEach(queueFile);
      refreshShell();
    },
    optimizeSelected,
    optimizeQueue,
    selectFile,
    getRecord,
    getComparableRecords,
    refreshTexts,
    refreshShell,
    clearList
  };
}
