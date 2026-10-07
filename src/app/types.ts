import type { OutputSpec } from '../domain/types';
import type { PreviewMode, ProcessedFileRecord } from '../types';

export interface RecordSettings {
  /** The outputs the composer asked for. One is the default; many is the point. */
  outputs: OutputSpec[];
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
