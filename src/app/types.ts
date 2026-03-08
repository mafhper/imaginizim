import type { OptimizationMode, OutputFormat, PreviewMode, ProcessedFileRecord } from '../types';

export interface RecordSettings {
  quality: number;
  scale: number;
  outputFormat: OutputFormat;
  optimizationMode: OptimizationMode;
}

export interface QueueRecord extends ProcessedFileRecord {
  previewUrl: string;
  compressedPreviewUrl: string | null;
  statusLabel: string;
  errorMessage: string | null;
  progress: number;
  settings: RecordSettings;
}

export interface ComparisonState {
  open: boolean;
  fileId: string | null;
  mode: PreviewMode;
  slider: number;
  zoom: 'fit' | '1' | '1.5' | '2';
}
