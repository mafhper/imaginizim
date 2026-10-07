/**
 * The compatibility layer.
 *
 * The current UI has one implicit output (`outputFormat` + `quality` + `scale`).
 * This adapter expresses that same intent as a one-element `OutputSpec[]`, so
 * the engine can move to the multi-output model without the UI changing first
 * (the plan's `legacy → OutputSpec[]`).
 */

import type { OptimizationMode, OutputFormat } from '../worker/types';
import { DEFAULT_DESTINATION, DEFAULT_NAMING, type OutputSpec } from './types';

/** The shape of the current settings this adapter needs — deliberately not the UI type. */
export interface LegacySettings {
  quality: number;
  scale: number;
  outputFormat: OutputFormat;
  optimizationMode: OptimizationMode;
  targetBytes?: number | null;
}

export function legacySettingsToOutputs(settings: LegacySettings): OutputSpec[] {
  return [
    {
      id: 'output-1',
      format: settings.outputFormat,
      quality: settings.quality,
      scale: settings.scale,
      optimizationMode: settings.optimizationMode,
      targetBytes: settings.targetBytes ?? null,
      naming: DEFAULT_NAMING,
      destination: DEFAULT_DESTINATION
    }
  ];
}

/** The one-output default the composer starts from. */
export const DEFAULT_LEGACY_SETTINGS: LegacySettings = {
  quality: 0.78,
  scale: 1,
  outputFormat: 'original',
  optimizationMode: 'balanced',
  targetBytes: null
};

export function defaultOutputs(): OutputSpec[] {
  return legacySettingsToOutputs(DEFAULT_LEGACY_SETTINGS);
}

/** A fresh output the composer appends, with a stable id. */
export function createOutput(id: string, format: OutputSpec['format'] = 'image/webp'): OutputSpec {
  return {
    id,
    format,
    quality: 0.8,
    scale: 1,
    optimizationMode: 'balanced',
    targetBytes: null,
    naming: DEFAULT_NAMING,
    destination: DEFAULT_DESTINATION
  };
}
