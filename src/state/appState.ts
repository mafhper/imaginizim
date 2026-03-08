import type {
  OptimizationMode,
  OutputFormat,
  PreviewMode,
  QueueDensity,
  ProcessedFileRecord
} from '../types';

export interface GlobalSettings {
  quality: number;
  scale: number;
  outputFormat: OutputFormat;
  optimizationMode: OptimizationMode;
}

export interface ComparisonState {
  isComparisonModalOpen: boolean;
  activePreviewFileId: string | null;
  activePreviewMode: PreviewMode;
  previewIndex: number;
}

export interface UiState {
  isMobileNavOpen: boolean;
  comparisonViewportMode: 'fixed';
  comparisonViewportHeight: string;
  queueDensity: QueueDensity;
}

export const globalSettings: GlobalSettings = {
  quality: 0.78,
  scale: 1,
  outputFormat: 'original',
  optimizationMode: 'balanced'
};

export const files = new Map<string, ProcessedFileRecord>();

let selectedFileId: string | null = null;
const comparisonState: ComparisonState = {
  isComparisonModalOpen: false,
  activePreviewFileId: null,
  activePreviewMode: 'split',
  previewIndex: 0
};

const uiState: UiState = {
  isMobileNavOpen: false,
  comparisonViewportMode: 'fixed',
  comparisonViewportHeight: 'clamp(280px, 56vh, 640px)',
  queueDensity: 'comfort'
};

export function setSelectedFileId(id: string | null): void {
  selectedFileId = id;
}

export function getSelectedFileId(): string | null {
  return selectedFileId;
}

export function setComparisonOpen(open: boolean): void {
  comparisonState.isComparisonModalOpen = open;
}

export function setActivePreviewFileId(id: string | null): void {
  comparisonState.activePreviewFileId = id;
}

export function setActivePreviewMode(mode: PreviewMode): void {
  comparisonState.activePreviewMode = mode;
}

export function setPreviewIndex(index: number): void {
  comparisonState.previewIndex = index;
}

export function getComparisonState(): ComparisonState {
  return {
    isComparisonModalOpen: comparisonState.isComparisonModalOpen,
    activePreviewFileId: comparisonState.activePreviewFileId,
    activePreviewMode: comparisonState.activePreviewMode,
    previewIndex: comparisonState.previewIndex
  };
}

export function setMobileNavOpen(isOpen: boolean): void {
  uiState.isMobileNavOpen = isOpen;
}

export function setQueueDensity(density: QueueDensity): void {
  uiState.queueDensity = density;
}

export function getUiState(): UiState {
  return {
    isMobileNavOpen: uiState.isMobileNavOpen,
    comparisonViewportMode: uiState.comparisonViewportMode,
    comparisonViewportHeight: uiState.comparisonViewportHeight,
    queueDensity: uiState.queueDensity
  };
}

export function clearFiles(): void {
  files.forEach((record) => {
    URL.revokeObjectURL(record.sourceObjectUrl);
    if (record.optimizedObjectUrl) {
      URL.revokeObjectURL(record.optimizedObjectUrl);
    }
  });

  files.clear();
  selectedFileId = null;
  comparisonState.isComparisonModalOpen = false;
  comparisonState.activePreviewFileId = null;
  comparisonState.activePreviewMode = 'split';
  comparisonState.previewIndex = 0;
}

export function setOptimizedBlob(record: ProcessedFileRecord, blob: Blob): void {
  if (record.optimizedObjectUrl) {
    URL.revokeObjectURL(record.optimizedObjectUrl);
  }

  record.optimizedObjectUrl = URL.createObjectURL(blob);
  record.blob = blob;
}
