import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from 'react';
import { createWorkerClient, type WorkerClient } from '../../compression/workerClient';
import { downloadZip } from '../../download/download';
import { t } from '../../i18n';
import type { PreviewMode, ProcessedFileRecord, WorkerCompressionResponse } from '../../types';
import { downloadBlob } from '../../utils/downloadBlob';
import { createId } from '../../utils/id';
import type { ComparisonState, QueueRecord, RecordSettings } from '../types';

const QUEUE_DENSITY_KEY = 'imaginizim.queue-density';
const PROCESS_TIMEOUT_MS = 45000;

type QueueDensity = 'comfort' | 'compact';

interface CompressionContextValue {
  files: QueueRecord[];
  selectedId: string | null;
  settings: RecordSettings;
  density: QueueDensity;
  comparison: ComparisonState;
  totalSavedBytes: number;
  doneCount: number;
  hasProcessing: boolean;
  hasProcessedOnce: boolean;
  setDensity: (density: QueueDensity) => void;
  setSettings: (patch: Partial<RecordSettings>) => void;
  addFiles: (incoming: File[]) => void;
  selectFile: (id: string) => void;
  removeFile: (id: string) => void;
  resetSession: () => void;
  reprocessFile: (id: string) => void;
  reprocessSelected: () => void;
  reprocessAll: () => void;
  downloadFile: (id: string) => void;
  downloadAll: () => Promise<void>;
  openComparison: (id: string) => void;
  closeComparison: () => void;
  setComparisonMode: (mode: PreviewMode) => void;
  setComparisonSlider: (value: number) => void;
  setComparisonZoom: (value: ComparisonState['zoom']) => void;
  nextComparedFile: () => void;
  previousComparedFile: () => void;
  issueUrl: string;
  repoUrl: string;
}

const CompressionContext = createContext<CompressionContextValue | null>(null);

function defaultSettings(): RecordSettings {
  return {
    quality: 0.78,
    scale: 1,
    outputFormat: 'original',
    optimizationMode: 'balanced'
  };
}

function getStoredDensity(): QueueDensity {
  try {
    const value = window.localStorage.getItem(QUEUE_DENSITY_KEY);
    return value === 'compact' ? 'compact' : 'comfort';
  } catch {
    return 'comfort';
  }
}

function persistDensity(value: QueueDensity) {
  try {
    window.localStorage.setItem(QUEUE_DENSITY_KEY, value);
  } catch {
    // ignore
  }
}

function statusText(record: QueueRecord) {
  if (record.status === 'queued') return t('engine.status_queued');
  if (record.status === 'processing') return t('engine.status_processing');
  if (record.status === 'error') return t('engine.status_error');
  const savedPercent = record.newSize
    ? Math.max(0, Math.round(((record.originalSize - record.newSize) / record.originalSize) * 100))
    : 0;
  return `${savedPercent}%`;
}

function processingStageLabel(stage?: WorkerCompressionResponse['stage']) {
  if (stage === 'analyzing') return t('engine.stage_analyzing');
  if (stage === 'encoding') return t('engine.stage_encoding');
  if (stage === 'encoding-manual') return t('engine.stage_encoding_manual');
  if (stage === 'evaluating') return t('engine.stage_evaluating');
  if (stage === 'finalizing') return t('engine.stage_finalizing');
  return t('engine.status_processing');
}

function asProcessedRecord(record: QueueRecord): ProcessedFileRecord {
  return {
    id: record.id,
    file: record.file,
    status: record.status,
    selected: record.selected,
    blob: record.blob,
    originalSize: record.originalSize,
    newSize: record.newSize,
    chosenFormat: record.chosenFormat,
    qualityScore: record.qualityScore,
    strategyUsed: record.strategyUsed,
    sourceObjectUrl: record.sourceObjectUrl,
    optimizedObjectUrl: record.optimizedObjectUrl
  };
}

export function CompressionProvider({ children }: PropsWithChildren) {
  const workerRef = useRef<WorkerClient | null>(null);
  const activeTimeoutRef = useRef<number | null>(null);
  const filesRef = useRef<QueueRecord[]>([]);
  const queueRef = useRef<string[]>([]);
  const activeIdRef = useRef<string | null>(null);
  const processNextRef = useRef<() => void>(() => {});
  const [files, setFiles] = useState<QueueRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settings, setSettingsState] = useState<RecordSettings>(defaultSettings);
  const [density, setDensityState] = useState<QueueDensity>(() => getStoredDensity());
  const [comparison, setComparison] = useState<ComparisonState>({
    open: false,
    fileId: null,
    mode: 'split',
    slider: 50,
    zoom: 'fit'
  });
  const repoUrl = useMemo(() => {
    const raw = __APP_REPO_URL__ || 'https://github.com/mafhper/imaginizim';
    if (raw.startsWith('git@github.com:')) {
      return `https://github.com/${raw.replace('git@github.com:', '').replace(/\.git$/, '')}`;
    }
    return raw.replace(/\.git$/, '');
  }, []);
  const issueUrl = `${repoUrl.replace(/\/$/, '')}/issues`;

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const handleWorkerMessage = useCallback((response: WorkerCompressionResponse) => {
    if (response.kind === 'progress') {
      setFiles((prev) =>
        prev.map((record) =>
          record.id !== response.id || record.status !== 'processing'
            ? record
            : {
                ...record,
                progress: Math.max(record.progress, response.progress ?? record.progress),
                statusLabel: processingStageLabel(response.stage)
              }
        )
      );
      return;
    }

    if (activeTimeoutRef.current) {
      window.clearTimeout(activeTimeoutRef.current);
      activeTimeoutRef.current = null;
    }

    setFiles((prev) =>
      prev.map((record) => {
        if (record.id !== response.id) return record;

        if (!response.success || !response.blob) {
          return {
            ...record,
            status: 'error',
            progress: 0,
            errorMessage: response.error ?? t('engine.error_fallback'),
            statusLabel: t('engine.status_error')
          };
        }

        if (record.compressedPreviewUrl) {
          URL.revokeObjectURL(record.compressedPreviewUrl);
        }

        const optimizedUrl = URL.createObjectURL(response.blob);
        return {
          ...record,
          status: 'done',
          progress: 100,
          blob: response.blob,
          newSize: response.newSize ?? response.blob.size,
          chosenFormat: response.chosenFormat ?? response.blob.type,
          qualityScore: response.qualityScore ?? record.qualityScore,
          strategyUsed: response.strategyUsed ?? record.strategyUsed,
          optimizedObjectUrl: optimizedUrl,
          compressedPreviewUrl: optimizedUrl,
          statusLabel: statusText({
            ...record,
            status: 'done',
            newSize: response.newSize ?? response.blob.size,
            chosenFormat: response.chosenFormat ?? response.blob.type,
            blob: response.blob,
            optimizedObjectUrl: optimizedUrl,
            compressedPreviewUrl: optimizedUrl
          } as QueueRecord)
        };
      })
    );

    activeIdRef.current = null;
    processNextRef.current();
  }, []);

  const ensureWorker = useCallback(() => {
    if (!workerRef.current) {
      const worker = createWorkerClient();
      worker.onMessage(handleWorkerMessage);
      worker.onError((message) => {
        if (!activeIdRef.current) return;
        const failedId = activeIdRef.current;
        if (activeTimeoutRef.current) {
          window.clearTimeout(activeTimeoutRef.current);
          activeTimeoutRef.current = null;
        }
        setFiles((prev) =>
          prev.map((record) =>
            record.id !== failedId
              ? record
              : {
                  ...record,
                  status: 'error',
                  progress: 0,
                  errorMessage: message || t('engine.error_fallback'),
                  statusLabel: t('engine.status_error')
                }
          )
        );
        activeIdRef.current = null;
        processNextRef.current();
      });
      workerRef.current = worker;
    }

    return workerRef.current;
  }, [handleWorkerMessage]);

  const processNext = useCallback(
    function processQueue() {
      const nextId = queueRef.current.shift() ?? null;
      if (!nextId) {
        activeIdRef.current = null;
        return;
      }

      activeIdRef.current = nextId;
      const target = filesRef.current.find((record) => record.id === nextId) ?? null;

      if (!target) {
        activeIdRef.current = null;
        processQueue();
        return;
      }

      setFiles((prev) =>
        prev.map((record) =>
          record.id !== nextId
            ? record
            : {
                ...record,
                status: 'processing',
                progress: 12,
                errorMessage: null,
                statusLabel: t('engine.status_processing')
              }
        )
      );

      ensureWorker().process({
        version: 1,
        id: target.id,
        file: target.file,
        type: target.file.type,
        quality: target.settings.quality,
        scale: target.settings.scale,
        outputFormat: target.settings.outputFormat,
        mode: target.settings.optimizationMode
      });

      if (activeTimeoutRef.current) {
        window.clearTimeout(activeTimeoutRef.current);
      }
      activeTimeoutRef.current = window.setTimeout(() => {
        const stalledId = activeIdRef.current;
        if (!stalledId) return;
        setFiles((prev) =>
          prev.map((record) =>
            record.id !== stalledId
              ? record
              : {
                  ...record,
                  status: 'error',
                  progress: 0,
                  errorMessage: 'O processamento demorou demais. Tente WebP ou reduza a escala.',
                  statusLabel: t('engine.status_error')
                }
          )
        );
        activeIdRef.current = null;
        activeTimeoutRef.current = null;
        processQueue();
      }, PROCESS_TIMEOUT_MS);
    },
    [ensureWorker]
  );

  useEffect(() => {
    processNextRef.current = processNext;
  }, [processNext]);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (activeTimeoutRef.current) {
        window.clearTimeout(activeTimeoutRef.current);
        activeTimeoutRef.current = null;
      }
    };
  }, []);

  const setSettings = useCallback((patch: Partial<RecordSettings>) => {
    setSettingsState((prev) => ({ ...prev, ...patch }));
  }, []);

  const enqueueRecords = useCallback((ids: string[]) => {
    ids.forEach((id) => {
      if (!queueRef.current.includes(id) && activeIdRef.current !== id) {
        queueRef.current.push(id);
      }
    });
  }, []);

  const addFiles = useCallback(
    (incoming: File[]) => {
      const nextRecords = incoming
        .filter((file) => file.type.startsWith('image/') || file.type === 'image/svg+xml')
        .map((file) => {
          const baseSettings = { ...settings };
          const previewUrl = URL.createObjectURL(file);
          const id = createId();
          return {
            id,
            file,
            status: 'queued' as const,
            selected: false,
            blob: null,
            originalSize: file.size,
            newSize: null,
            chosenFormat:
              baseSettings.outputFormat === 'original' ? file.type : baseSettings.outputFormat,
            qualityScore: 0,
            strategyUsed: 'queued',
            sourceObjectUrl: previewUrl,
            optimizedObjectUrl: null,
            previewUrl,
            compressedPreviewUrl: null,
            statusLabel: t('engine.status_queued'),
            errorMessage: null,
            progress: 0,
            settings: baseSettings
          };
        });

      if (nextRecords.length === 0) return;

      setFiles((prev) => {
        const hasSelected = prev.some((record) => record.selected);
        const merged = [...prev, ...nextRecords].map((record, index) => {
          if (hasSelected) return record;
          if (index === 0) {
            return { ...record, selected: true };
          }
          return record;
        });
        filesRef.current = merged;
        return merged;
      });

      setSelectedId((current) => current ?? nextRecords[0]?.id ?? null);
    },
    [settings]
  );

  const selectFile = useCallback((id: string) => {
    setSelectedId(id);
    setFiles((prev) => prev.map((record) => ({ ...record, selected: record.id === id })));
  }, []);

  const removeFile = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const target = prev.find((record) => record.id === id);
        if (target) {
          URL.revokeObjectURL(target.previewUrl);
          if (target.compressedPreviewUrl) {
            URL.revokeObjectURL(target.compressedPreviewUrl);
          }
        }

        const filtered = prev.filter((record) => record.id !== id);
        if (filtered.length > 0 && !filtered.some((record) => record.selected)) {
          filtered[0] = { ...filtered[0], selected: true };
          setSelectedId(filtered[0].id);
        } else if (filtered.length === 0) {
          setSelectedId(null);
        }
        filesRef.current = filtered;
        return filtered;
      });

      queueRef.current = queueRef.current.filter((queuedId) => queuedId !== id);
      if (comparison.fileId === id) {
        setComparison((prev) => ({ ...prev, open: false, fileId: null }));
      }
    },
    [comparison.fileId]
  );

  const resetSession = useCallback(() => {
    queueRef.current = [];
    activeIdRef.current = null;
    if (activeTimeoutRef.current) {
      window.clearTimeout(activeTimeoutRef.current);
      activeTimeoutRef.current = null;
    }
    setFiles((prev) => {
      prev.forEach((record) => {
        URL.revokeObjectURL(record.previewUrl);
        if (record.compressedPreviewUrl) {
          URL.revokeObjectURL(record.compressedPreviewUrl);
        }
      });
      filesRef.current = [];
      return [];
    });
    setSelectedId(null);
    setComparison({ open: false, fileId: null, mode: 'split', slider: 50, zoom: 'fit' });
  }, []);

  const prepareReprocess = useCallback(
    (targetIds: string[]) => {
      setFiles((prev) => {
        const nextFiles = prev.map((record) => {
          if (!targetIds.includes(record.id)) return record;
          if (record.compressedPreviewUrl) {
            URL.revokeObjectURL(record.compressedPreviewUrl);
          }
          const next: QueueRecord = {
            ...record,
            status: 'queued',
            progress: 0,
            errorMessage: null,
            blob: null,
            newSize: null,
            qualityScore: 0,
            strategyUsed: 'manual-reprocess',
            optimizedObjectUrl: null,
            compressedPreviewUrl: null,
            statusLabel: t('engine.status_queued'),
            settings: { ...settings },
            chosenFormat:
              settings.outputFormat === 'original' ? record.file.type : settings.outputFormat
          };
          return next;
        });

        filesRef.current = nextFiles;
        return nextFiles;
      });
      enqueueRecords(targetIds);
      if (!activeIdRef.current) {
        processNext();
      }
    },
    [enqueueRecords, processNext, settings]
  );

  const reprocessFile = useCallback((id: string) => prepareReprocess([id]), [prepareReprocess]);
  const reprocessSelected = useCallback(() => {
    if (selectedId) prepareReprocess([selectedId]);
  }, [prepareReprocess, selectedId]);
  const reprocessAll = useCallback(() => {
    const ids = files.map((record) => record.id);
    if (ids.length === 0) return;

    const hasProcessed = files.some(
      (record) => record.status === 'done' || record.status === 'error' || record.blob !== null
    );

    if (hasProcessed) {
      prepareReprocess(ids);
      return;
    }

    enqueueRecords(ids);
    if (!activeIdRef.current) {
      processNext();
    }
  }, [enqueueRecords, files, prepareReprocess, processNext]);

  const downloadFileById = useCallback(
    (id: string) => {
      const target = files.find((record) => record.id === id);
      if (!target?.blob) return;
      downloadBlob(target.blob, `optimized-${target.file.name}`);
    },
    [files]
  );

  const downloadAll = useCallback(async () => {
    await downloadZip(files.map(asProcessedRecord));
  }, [files]);

  const doneFiles = useMemo(() => files.filter((record) => record.status === 'done'), [files]);

  const openComparison = useCallback((id: string) => {
    setComparison((prev) => ({ ...prev, open: true, fileId: id, slider: 50 }));
  }, []);
  const closeComparison = useCallback(() => {
    setComparison((prev) => ({ ...prev, open: false, fileId: null }));
  }, []);
  const setComparisonMode = useCallback((mode: PreviewMode) => {
    setComparison((prev) => ({ ...prev, mode }));
  }, []);
  const setComparisonSlider = useCallback((value: number) => {
    setComparison((prev) => ({ ...prev, slider: value }));
  }, []);
  const setComparisonZoom = useCallback((value: ComparisonState['zoom']) => {
    setComparison((prev) => ({ ...prev, zoom: value }));
  }, []);

  const stepComparedFile = useCallback(
    (direction: -1 | 1) => {
      if (!comparison.fileId || doneFiles.length < 2) return;
      const index = doneFiles.findIndex((record) => record.id === comparison.fileId);
      if (index < 0) return;
      const nextIndex = (index + direction + doneFiles.length) % doneFiles.length;
      setComparison((prev) => ({ ...prev, fileId: doneFiles[nextIndex].id }));
    },
    [comparison.fileId, doneFiles]
  );

  const totalSavedBytes = useMemo(
    () =>
      files.reduce(
        (sum, record) =>
          sum + Math.max(0, record.originalSize - (record.newSize ?? record.originalSize)),
        0
      ),
    [files]
  );

  const value = useMemo<CompressionContextValue>(
    () => ({
      files,
      selectedId,
      settings,
      density,
      comparison,
      totalSavedBytes,
      doneCount: doneFiles.length,
      hasProcessing:
        activeIdRef.current !== null || files.some((record) => record.status === 'processing'),
      hasProcessedOnce: files.some(
        (record) => record.status === 'done' || record.status === 'error' || record.blob !== null
      ),
      setDensity: (nextDensity) => {
        setDensityState(nextDensity);
        persistDensity(nextDensity);
      },
      setSettings,
      addFiles,
      selectFile,
      removeFile,
      resetSession,
      reprocessFile,
      reprocessSelected,
      reprocessAll,
      downloadFile: downloadFileById,
      downloadAll,
      openComparison,
      closeComparison,
      setComparisonMode,
      setComparisonSlider,
      setComparisonZoom,
      nextComparedFile: () => stepComparedFile(1),
      previousComparedFile: () => stepComparedFile(-1),
      issueUrl,
      repoUrl
    }),
    [
      addFiles,
      closeComparison,
      comparison,
      density,
      doneFiles.length,
      downloadAll,
      downloadFileById,
      files,
      issueUrl,
      openComparison,
      removeFile,
      reprocessAll,
      reprocessFile,
      reprocessSelected,
      repoUrl,
      resetSession,
      selectFile,
      selectedId,
      setComparisonMode,
      setComparisonSlider,
      setComparisonZoom,
      setSettings,
      settings,
      stepComparedFile,
      totalSavedBytes
    ]
  );

  useEffect(() => {
    return () => {
      filesRef.current.forEach((record) => {
        URL.revokeObjectURL(record.previewUrl);
        if (record.compressedPreviewUrl) {
          URL.revokeObjectURL(record.compressedPreviewUrl);
        }
      });
      if (activeTimeoutRef.current) {
        window.clearTimeout(activeTimeoutRef.current);
        activeTimeoutRef.current = null;
      }
    };
  }, []);

  return <CompressionContext.Provider value={value}>{children}</CompressionContext.Provider>;
}

export function useCompressionApp() {
  const context = useContext(CompressionContext);
  if (!context) {
    throw new Error('useCompressionApp must be used within CompressionProvider');
  }
  return context;
}
