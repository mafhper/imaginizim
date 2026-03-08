export type OutputFormat =
  | 'original'
  | 'auto'
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/avif'
  | 'image/svg+xml';

export type OptimizationMode = 'balanced' | 'max-compression' | 'max-speed';

export type ImageKind = 'photo' | 'graphic' | 'transparent-graphic' | 'ui-screenshot' | 'vector';

export interface ImageProfile {
  kind: ImageKind;
  width: number;
  height: number;
  hasAlpha: boolean;
  complexity: number;
}

export interface WorkerCompressionRequest {
  version: 1;
  id: string;
  file: File;
  type: string;
  quality: number;
  scale: number;
  outputFormat: OutputFormat;
  mode: OptimizationMode;
  profileHint?: Partial<ImageProfile>;
}

export interface WorkerCompressionResponse {
  version: 1;
  id: string;
  kind?: 'progress' | 'result';
  success: boolean;
  progress?: number;
  stage?: 'analyzing' | 'encoding' | 'encoding-manual' | 'evaluating' | 'finalizing';
  blob?: Blob;
  originalSize?: number;
  newSize?: number;
  chosenFormat?: string;
  qualityScore?: number;
  bytesSaved?: number;
  strategyUsed?: string;
  error?: string;
}

export interface CompressionCandidate {
  format: string;
  strategyUsed: string;
}

export interface RasterCompressionOptions {
  targetFormat: string;
  scale: number;
  quality: number;
  mode: OptimizationMode;
  profile: ImageProfile;
}
