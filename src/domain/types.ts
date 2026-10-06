/**
 * The asset domain: the vocabulary the workbench is built on.
 *
 * This module is **pure** — types and plain data, no DOM, no worker, no I/O.
 * It is the enabler for multi-output (one asset → many artifacts), which is why
 * it exists before the engine is rewritten.
 *
 * Vocabulary that already exists in the worker protocol (`OutputFormat`,
 * `OptimizationMode`) is imported from its single source of truth rather than
 * re-declared — the plan's C5 correction. The dependency is type-only, so the
 * domain stays runtime-free.
 */

import type { OptimizationMode, OutputFormat } from '../worker/types';

export type TreatmentOperation =
  'optimize' | 'convert' | 'resize' | 'vectorize' | 'normalize-svg' | 'inspect-svg' | 'custom';

export type CollisionPolicy = 'ask' | 'skip' | 'overwrite' | 'suffix';

export interface DestinationSpec {
  type: 'workspace' | 'project' | 'custom';
  path: string;
  createIfMissing: boolean;
  collisionPolicy: CollisionPolicy;
}

export interface NamingRule {
  /** Template with `{token}` placeholders; see `resolveNaming`. */
  pattern: string;
  /** Extra literal values available to the pattern, merged over the context. */
  variables?: Record<string, string>;
}

export interface OutputSpec {
  id: string;
  format: OutputFormat;
  quality?: number;
  scale?: number;
  optimizationMode?: OptimizationMode;
  /** Byte budget for this output, when one was asked for. */
  targetBytes?: number | null;
  naming?: NamingRule;
  destination?: DestinationSpec;
}

export interface AssetReference {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface RasterAssetMetadata {
  kind: 'raster';
  width: number;
  height: number;
  hasAlpha: boolean;
  colorSpace?: string;
  estimatedComplexity?: number;
}

export interface SvgAssetMetadata {
  kind: 'svg';
  width?: number;
  height?: number;
  viewBox?: string;
  elementCount: number;
  pathCount: number;
  imageCount: number;
  textCount: number;
  gradientCount: number;
  filterCount: number;
  maskCount: number;
  clipPathCount: number;
  embeddedRaster: boolean;
  externalReferences: boolean;
  structuralRisk: 'low' | 'medium' | 'high';
}

export type AssetMetadata = RasterAssetMetadata | SvgAssetMetadata;

export interface Asset extends AssetReference {
  extension: string;
  metadata?: AssetMetadata;
}

/** A treatment is an intention: a source asset and the outputs it should produce. */
export interface Treatment {
  id: string;
  operation: TreatmentOperation;
  sourceAssetId: string;
  outputs: OutputSpec[];
}

export type ArtifactStatus = 'pending' | 'processing' | 'done' | 'error' | 'skipped';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  artifactId?: string;
}

export interface ValidationReport {
  /** `false` when any issue is an `error`. Warnings never fail the report. */
  ok: boolean;
  issues: ValidationIssue[];
}

export interface Artifact {
  id: string;
  spec: OutputSpec;
  status: ArtifactStatus;
  blob?: Blob;
  validation?: ValidationReport;
  errorMessage?: string;
}

export type DeliveryMode = 'single' | 'directory' | 'zip';

export interface DeliveryPlan {
  mode: DeliveryMode;
  /** The artifacts the plan refers to, by id. */
  artifactIds: string[];
}

export const DEFAULT_NAMING: NamingRule = { pattern: '{basename}.{ext}' };

export const DEFAULT_DESTINATION: DestinationSpec = {
  type: 'workspace',
  path: '',
  createIfMissing: false,
  collisionPolicy: 'suffix'
};
